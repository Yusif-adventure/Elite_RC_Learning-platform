-- Final exams, enforced attempts, completion certificates, and public verification.
alter table public.courses add column if not exists final_exam jsonb not null default '[]'::jsonb;

-- Give the two starter courses a usable exam on first installation.
update public.courses set final_exam = '[
  {"prompt":"Which control surface primarily changes an RC plane’s pitch?","options":["Elevator","Rudder","Aileron","Flap"],"correctIndex":0},
  {"prompt":"What should you do before the first flight?","options":["Disable failsafe","Check control direction and range","Remove the propeller permanently","Fly in a crowded area"],"correctIndex":1},
  {"prompt":"What creates lift on a wing?","options":["Airflow around the wing","The receiver antenna","The battery label","The rudder servo"],"correctIndex":0},
  {"prompt":"What is a safe response to a damaged propeller?","options":["Continue at low throttle","Repair it with tape","Replace it before flight","Ignore small cracks"],"correctIndex":2},
  {"prompt":"Which surface controls yaw?","options":["Elevator","Rudder","Aileron","Flap"],"correctIndex":1}
]'::jsonb where title = 'Introduction to RC Planes' and final_exam = '[]'::jsonb;
update public.courses set final_exam = '[
  {"prompt":"What does binding connect?","options":["Transmitter and receiver","Motor and propeller","Battery and charger","Servo and control horn"],"correctIndex":0},
  {"prompt":"Why perform a range check?","options":["To check battery color","To confirm reliable radio control at distance","To calibrate the motor","To change channel assignments"],"correctIndex":1},
  {"prompt":"What should failsafe do after signal loss?","options":["Increase throttle","Move controls to a safe preset","Turn off the transmitter","Rebind automatically"],"correctIndex":1},
  {"prompt":"What does a receiver do?","options":["Sends pilot commands","Receives radio commands and drives servos","Charges the flight battery","Measures wind speed"],"correctIndex":1},
  {"prompt":"When should control directions be checked?","options":["Before every flight","Only after a crash","Only during binding","Never after setup"],"correctIndex":0}
]'::jsonb where title = 'Transmitters & Receivers' and final_exam = '[]'::jsonb;

create table if not exists public.final_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  passed boolean not null,
  submitted_at timestamptz not null default now(),
  unique (id, user_id, course_id)
);
create index if not exists final_exam_attempts_learner_course_idx
  on public.final_exam_attempts(user_id, course_id, submitted_at);
alter table public.final_exam_attempts enable row level security;
drop policy if exists "Learners read their exam results" on public.final_exam_attempts;
create policy "Learners read their exam results" on public.final_exam_attempts
  for select to authenticated using (user_id = auth.uid());

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_id text not null unique default ('ELITE-' || upper(substr(encode(gen_random_bytes(12), 'hex'), 1, 16))),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  issued_at timestamptz not null default now(),
  exam_attempt_id uuid not null unique,
  unique (user_id, course_id),
  foreign key (exam_attempt_id, user_id, course_id)
    references public.final_exam_attempts(id, user_id, course_id) on delete cascade
);
alter table public.certificates enable row level security;
drop policy if exists "Learners read their certificates" on public.certificates;
create policy "Learners read their certificates" on public.certificates
  for select to authenticated using (user_id = auth.uid());

create or replace function public.submit_final_exam(p_course_id uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare
  learner uuid := auth.uid();
  exam jsonb;
  total integer;
  correct integer := 0;
  question jsonb;
  answer_index integer;
  attempts integer;
  score_value integer;
  passed_value boolean;
  attempt_row public.final_exam_attempts%rowtype;
  cert_row public.certificates%rowtype;
  lesson_total integer;
  completed_total integer;
begin
  if learner is null then raise exception 'Sign in to take the final exam.'; end if;
  select final_exam into exam from public.courses where id = p_course_id and status = 'published';
  if exam is null or jsonb_typeof(exam) <> 'array' or jsonb_array_length(exam) = 0 then
    raise exception 'This course does not have a final exam yet.';
  end if;
  select count(*) into lesson_total
    from public.course_lessons l join public.course_sections s on s.id = l.section_id
    where s.course_id = p_course_id;
  select count(distinct lp.lesson_key) into completed_total
    from public.lesson_progress lp
    join public.course_lessons l on lp.lesson_key::jsonb = jsonb_build_array(
      (select s.title from public.course_sections s where s.id = l.section_id), l.title
    )
    join public.course_sections s on s.id = l.section_id
    where s.course_id = p_course_id and lp.course_id = p_course_id and lp.user_id = learner;
  if lesson_total = 0 or completed_total < lesson_total then
    raise exception 'Complete all course lessons before taking the final exam.';
  end if;
  perform pg_advisory_xact_lock(hashtext(learner::text || p_course_id::text));
  if exists (select 1 from public.certificates where user_id = learner and course_id = p_course_id) then
    raise exception 'You have already passed this exam.';
  end if;
  select count(*) into attempts from public.final_exam_attempts where user_id = learner and course_id = p_course_id;
  if attempts >= 3 then raise exception 'You have used all three attempts.'; end if;
  total := jsonb_array_length(exam);
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) <> total then
    raise exception 'Answer every exam question before submitting.';
  end if;
  for question, answer_index in
    select q.value, (p_answers -> (q.ordinality - 1) ->> 'selectedIndex')::integer
    from jsonb_array_elements(exam) with ordinality q
  loop
    if answer_index = (question ->> 'correctIndex')::integer then correct := correct + 1; end if;
  end loop;
  score_value := round(correct * 100.0 / total)::integer;
  passed_value := score_value >= 70;
  insert into public.final_exam_attempts(user_id, course_id, score, passed)
    values (learner, p_course_id, score_value, passed_value) returning * into attempt_row;
  if passed_value then
    insert into public.certificates(user_id, course_id, exam_attempt_id)
      values (learner, p_course_id, attempt_row.id) returning * into cert_row;
  end if;
  return jsonb_build_object(
    'score', score_value, 'passed', passed_value,
    'attemptsUsed', attempts + 1, 'attemptsRemaining', 3 - attempts - 1,
    'certificate', case when passed_value then jsonb_build_object(
      'certificateId', cert_row.certificate_id, 'issuedAt', cert_row.issued_at,
      'courseId', p_course_id, 'userId', learner
    ) else null end
  );
end;
$$;
revoke all on function public.submit_final_exam(uuid, jsonb) from public;
grant execute on function public.submit_final_exam(uuid, jsonb) to authenticated;

create or replace function public.verify_certificate(p_certificate_id text)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if auth.uid() is null or coalesce(auth.jwt()->'app_metadata'->>'role', '') not in ('staff', 'instructor') then
    return jsonb_build_object('valid', false);
  end if;
  return coalesce((select jsonb_build_object(
    'valid', true, 'certificateId', c.certificate_id,
    'learnerName', coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'Learner'),
    'courseTitle', coalesce(cr.title, 'Course'), 'issuedAt', c.issued_at
  )
  from public.certificates c
  join auth.users u on u.id = c.user_id
  join public.courses cr on cr.id = c.course_id
  where c.certificate_id = upper(trim(p_certificate_id))
  limit 1), jsonb_build_object('valid', false));
end;
$$;
revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to authenticated;
