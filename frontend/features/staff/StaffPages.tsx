import { createContext, useContext, useState, type ReactNode } from "react";
import { courseImageProps } from "../../imageFallback";
import {
  courseInsights,
  dashboardTotals,
  filterCourseInsights,
  filterMembers,
  lessonCompletion,
  memberSummary,
  recentActivity,
  timeAgo,
  type CourseFilters,
  type CourseInsight,
  type Member,
  type Role,
  type StaffProgressRow,
} from "../../staffStats";
import { ConfirmDialog } from "./Feedback";
import type { StaffDataStatus } from "./useStaffData";
import type { SavedFinalExam, SavedQuiz } from "./quizDrafts";
import "./staffDashboard.css";

type StaffPage = "admin" | "builder" | "instructor" | "members" | "course";

// The signed-in staff member, shown in the staff sidebar.
export type StaffAccount = {
  id: string;
  name: string;
  initials: string;
  role: "staff" | "instructor";
  onViewSite: () => void;
  onSignOut: () => void;
};
export const StaffAccountContext = createContext<StaffAccount | null>(null);

export type CourseResource = {
  name: string;
  url: string;
};

export type StaffCourse = {
  id?: string;
  status?: string;
  title: string;
  desc: string;
  level: string;
  lessons: number;
  duration: string;
  instructor: string;
  instructorImage?: string;
  image: string;
  category: string;
  objectives: string[];
  sections: string[];
  sampleLessons: string[];
  lessonContent?: {
    // Database id for loading the lesson's quiz. It changes on every save.
    id?: string;
    title: string;
    section: string;
    slides: CourseResource[];
    video?: CourseResource;
    youtubeUrl?: string;
    // Staff reads include the quiz with its answer key; null removes it on save.
    quiz?: SavedQuiz | null;
  }[];
  finalExam?: SavedFinalExam | null;
  // Only on the staff course list.
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type StaffPagesProps = {
  courses: StaffCourse[];
  onNavigate: (page: StaffPage, course?: StaffCourse) => void;
  onSaveCourse: (course: StaffCourse) => Promise<void>;
  onDeleteCourse: (course: StaffCourse) => void;
  editingCourse?: StaffCourse;
};

export type StaffDashboardProps = StaffPagesProps & {
  members: Member[];
  progress: StaffProgressRow[];
  status: StaffDataStatus;
  error: string;
  notes: string[];
  onReload: () => void;
  onTogglePublish: (course: StaffCourse) => Promise<void>;
  onChangeRole: (member: Member, role: Role) => Promise<void>;
};

const ROLE_LABELS: Record<Role, string> = {
  member: "Learner",
  instructor: "Instructor",
  staff: "Staff",
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

const initialsOf = (name: string) =>
  name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

export function StaffButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline";
  disabled?: boolean;
}) {
  return (
    <button type="button" className={`btn ${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

const NAV_ICONS: Record<string, ReactNode> = {
  admin: <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />,
  members: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
    </>
  ),
  instructor: <path d="M3 6.5 12 3l9 3.5-9 3.5zM6.5 8v5.5c0 1.8 2.5 3.5 5.5 3.5s5.5-1.7 5.5-3.5V8M21 6.5V12" />,
  builder: <path d="M12 5v14M5 12h14" />,
};

function NavIcon({ page }: { page: string }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      {NAV_ICONS[page]}
    </svg>
  );
}

export function StaffShell({
  children,
  active,
  onNavigate,
}: {
  children: ReactNode;
  active: StaffPage;
  onNavigate: StaffPagesProps["onNavigate"];
}) {
  const [open, setOpen] = useState(false);
  const account = useContext(StaffAccountContext);
  const nav: [StaffPage, string, string][] = [
    ["admin", "Overview", "Numbers, activity, and every course"],
    ["members", "Members", "Who has joined and how far they have got"],
    ["instructor", "Instructor workspace", "How learners are doing in each course"],
    ["builder", "Create course", "Build a learning path"],
  ];

  return (
    <div className="app-shell">
      <aside className={`side ${open ? "open" : ""}`}>
        <button className="brand" onClick={() => onNavigate("admin")}>
          <span className="brand-mark">✈</span>
          <span>
            <b>ELITE RC</b>
            <small>STAFF WORKSPACE</small>
          </span>
        </button>
        <div className="side-label">STAFF WORKSPACE</div>
        <nav>
          {nav.map(([page, label, description]) => (
            <button
              key={page}
              className={active === page ? "active" : ""}
              title={description}
              aria-current={active === page ? "page" : undefined}
              onClick={() => {
                onNavigate(page);
                setOpen(false);
              }}
            >
              <NavIcon page={page} />
              {label}
            </button>
          ))}
        </nav>
        {account && (
          <>
            <nav className="side-account">
              <button onClick={account.onViewSite}>
                <span aria-hidden="true">←</span>
                View learner site
              </button>
              <button onClick={account.onSignOut}>
                <span aria-hidden="true">⎋</span>
                Sign out
              </button>
            </nav>
            <div className="side-user">
              <span>{account.initials}</span>
              <div>
                <b>{account.name}</b>
                <small>{ROLE_LABELS[account.role]}</small>
              </div>
            </div>
          </>
        )}
      </aside>
      {open && <button className="side-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <div className="workspace">
        <header className="app-top">
          <button
            type="button"
            className="app-menu staff-menu"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {/* Same three-line drawing as the learner dashboard's menu icon. */}
            <svg className="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d={open ? "m6 6 12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} />
            </svg>
          </button>
          <div>
            <span className="status-dot" />
            Staff tools
          </div>
          <button
            type="button"
            className="top-profile"
            onClick={() => onNavigate("admin")}
            title={account?.name}
            aria-label={account ? `${account.name}, staff overview` : "Staff overview"}
          >
            <span>{account?.initials}</span>
          </button>
        </header>
        <main className="workspace-main">{children}</main>
      </div>
    </div>
  );
}

// Loading, failed, or ready: staff pages show their content only when ready.
function DataState({
  status,
  error,
  notes,
  onReload,
  children,
}: Pick<StaffDashboardProps, "status" | "error" | "notes" | "onReload"> & { children: ReactNode }) {
  if (status === "error") {
    return (
      <section className="panel state-panel" role="alert">
        <span className="state-icon" aria-hidden="true">!</span>
        <h2>We could not load the staff workspace.</h2>
        <p>{error}</p>
        <StaffButton onClick={onReload}>Try again</StaffButton>
      </section>
    );
  }
  if (status !== "ready") {
    return (
      <div aria-busy="true" aria-label="Loading the staff workspace">
        <div className="stat-grid">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="stat-tile skeleton" />
          ))}
        </div>
        <div className="panel skeleton-panel">
          {[0, 1, 2].map((item) => (
            <div key={item} className="skeleton-row">
              <span className="skeleton" />
              <span className="skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <>
      {notes.map((note) => (
        <p key={note} className="dash-note" role="status">
          {note}
        </p>
      ))}
      {children}
    </>
  );
}

function StatTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: "blue" | "green" | "cyan" | "amber";
}) {
  return (
    <div className={`stat-tile ${tone}`}>
      <span>{label}</span>
      <b>{value.toLocaleString()}</b>
      <small>{detail}</small>
    </div>
  );
}

function Meter({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="meter" role="img" aria-label={label}>
      <span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <b>{title}</b>
      <p>{message}</p>
      {action}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </svg>
  );
}

function CourseRow({
  insight,
  onNavigate,
  onDeleteCourse,
  onTogglePublish,
}: {
  insight: CourseInsight<StaffCourse>;
} & Pick<StaffDashboardProps, "onNavigate" | "onDeleteCourse" | "onTogglePublish">) {
  const { course, learners, averagePercent } = insight;
  const [busy, setBusy] = useState(false);
  const published = course.status === "published";

  const togglePublish = async () => {
    setBusy(true);
    try {
      await onTogglePublish(course);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="course-row">
      <img {...courseImageProps(course.image)} alt="" />
      <div className="course-row-main">
        <div className="course-row-title">
          <b>{course.title}</b>
          <span className={`status-badge ${published ? "live" : "draft"}`}>
            {published ? "Published" : "Draft"}
          </span>
        </div>
        <span className="course-row-meta">
          {course.category} · {course.level} · {plural(course.lessons, "lesson")}
          {course.updatedAt && ` · changed ${timeAgo(course.updatedAt)}`}
        </span>
      </div>
      <div className="course-row-stats">
        <b>{plural(learners, "learner")}</b>
        <Meter percent={averagePercent} label={`Average progress ${averagePercent}%`} />
        <small>{learners ? `${averagePercent}% average progress` : "No one has started yet"}</small>
      </div>
      <div className="course-row-actions">
        {published && (
          <StaffButton variant="outline" onClick={() => onNavigate("course", course)}>
            View
          </StaffButton>
        )}
        <StaffButton variant="outline" onClick={() => onNavigate("builder", course)}>
          Edit
        </StaffButton>
        <StaffButton variant="outline" disabled={busy} onClick={() => void togglePublish()}>
          {busy ? "Saving..." : published ? "Unpublish" : "Publish"}
        </StaffButton>
        <button
          type="button"
          className="icon-danger"
          aria-label={`Delete ${course.title}`}
          title="Delete course"
          onClick={() => onDeleteCourse(course)}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

function Segmented<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: [Value, string][];
  onChange: (value: Value) => void;
}) {
  // Four options become a 2-by-2 grid on phones instead of a row that cuts one off.
  return (
    <div className={`segmented ${options.length > 3 ? "two-rows" : ""}`} role="group" aria-label={label}>
      {options.map(([option, text]) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          className={value === option ? "active" : ""}
          onClick={() => onChange(option)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function StaffOverview(props: StaffDashboardProps) {
  const { courses, members, progress, onNavigate } = props;
  const [filters, setFilters] = useState<CourseFilters>({ search: "", status: "all", sort: "updated" });
  const totals = dashboardTotals(members, courses, progress, new Date());
  const insights = courseInsights(courses, progress);
  const shown = filterCourseInsights(insights, filters);
  const activity = recentActivity(members, courses, progress);
  const activeShare = totals.learners ? Math.round((totals.activeThisWeek / totals.learners) * 100) : 0;

  return (
    <StaffShell active="admin" onNavigate={onNavigate}>
      <div className="page-title">
        <div>
          <span className="eyebrow">STAFF OVERVIEW</span>
          <h1>Learning hub control center</h1>
          <p>See how learners are doing and manage every course.</p>
        </div>
        <StaffButton onClick={() => onNavigate("builder")}>Create new course</StaffButton>
      </div>
      <DataState {...props}>
        <div className="stat-grid">
          <StatTile
            tone="blue"
            label="Learners"
            value={totals.learners}
            detail={`+${totals.newThisWeek} joined this week`}
          />
          <StatTile
            tone="green"
            label="Lessons completed"
            value={totals.lessonsCompleted}
            detail={`${totals.completedThisWeek} this week`}
          />
          <StatTile
            tone="cyan"
            label="Active this week"
            value={totals.activeThisWeek}
            detail={totals.learners ? `${activeShare}% of learners` : "No learners yet"}
          />
          <StatTile
            tone="amber"
            label="Courses"
            value={courses.length}
            detail={`${totals.published} published · ${plural(totals.drafts, "draft")}`}
          />
        </div>
        <div className="dash-columns">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Courses</h2>
                <p>Drafts are visible to staff only until you publish them.</p>
              </div>
            </div>
            <div className="table-tools">
              <input
                type="search"
                value={filters.search}
                onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                placeholder="Search by title, category, or instructor"
                aria-label="Search courses"
              />
              <Segmented
                label="Show courses"
                value={filters.status}
                options={[
                  ["all", "All"],
                  ["published", "Published"],
                  ["draft", "Drafts"],
                ]}
                onChange={(status) => setFilters({ ...filters, status })}
              />
              <select
                value={filters.sort}
                onChange={(event) =>
                  setFilters({ ...filters, sort: event.target.value as CourseFilters["sort"] })
                }
                aria-label="Sort courses"
              >
                <option value="updated">Recently changed</option>
                <option value="title">Title A–Z</option>
                <option value="learners">Most learners</option>
              </select>
            </div>
            {courses.length === 0 ? (
              <EmptyState
                title="No courses yet"
                message="Create the first course. You can save it as a draft until it is ready."
                action={<StaffButton onClick={() => onNavigate("builder")}>Create course</StaffButton>}
              />
            ) : shown.length === 0 ? (
              <EmptyState
                title="No courses match"
                message="Try a different search or show all courses."
                action={
                  <StaffButton
                    variant="outline"
                    onClick={() => setFilters({ search: "", status: "all", sort: filters.sort })}
                  >
                    Clear filters
                  </StaffButton>
                }
              />
            ) : (
              shown.map((insight) => (
                <CourseRow
                  key={insight.course.id ?? insight.course.title}
                  insight={insight}
                  onNavigate={onNavigate}
                  onDeleteCourse={props.onDeleteCourse}
                  onTogglePublish={props.onTogglePublish}
                />
              ))
            )}
          </section>
          <section className="panel activity-panel">
            <div className="panel-head">
              <div>
                <h2>Recent activity</h2>
                <p>Sign-ups, finished lessons, and course changes.</p>
              </div>
            </div>
            {activity.length === 0 ? (
              <p className="panel-note">Nothing has happened yet.</p>
            ) : (
              <ol className="activity-list">
                {activity.map((item) => (
                  <li key={item.key} className={`activity ${item.kind}`}>
                    <span className="activity-dot" aria-hidden="true" />
                    <div>
                      <p>{item.text}</p>
                      <time dateTime={item.at}>{timeAgo(item.at)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </DataState>
    </StaffShell>
  );
}

export function MembersPage(props: StaffDashboardProps) {
  const { members, courses, progress, onNavigate, onChangeRole } = props;
  const viewer = useContext(StaffAccountContext);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"all" | Role>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ member: Member; role: Role } | null>(null);
  const [saving, setSaving] = useState(false);
  const canChangeRoles = viewer?.role === "staff";
  const shown = filterMembers(members, { search, role });
  const count = (value: Role) => members.filter((member) => member.role === value).length;

  const confirmRole = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await onChangeRole(pending.member, pending.role);
      setPending(null);
    } catch {
      // The error is shown as a notice; keep the dialog open to try again.
    } finally {
      setSaving(false);
    }
  };

  return (
    <StaffShell active="members" onNavigate={onNavigate}>
      <div className="page-title">
        <div>
          <span className="eyebrow">MEMBERS</span>
          <h1>Members and access</h1>
          <p>See who has joined, how far they have got, and who can use the staff workspace.</p>
        </div>
      </div>
      <DataState {...props}>
        <section className="panel">
          <div className="table-tools">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email"
              aria-label="Search members"
            />
            <Segmented
              label="Show members"
              value={role}
              options={[
                ["all", `All (${members.length})`],
                ["member", `Learners (${count("member")})`],
                ["instructor", `Instructors (${count("instructor")})`],
                ["staff", `Staff (${count("staff")})`],
              ]}
              onChange={setRole}
            />
          </div>
          {!canChangeRoles && (
            <p className="panel-note compact">Only staff accounts can change someone's role.</p>
          )}
          <div className="member-head" aria-hidden="true">
            <span>Member</span>
            <span>Role</span>
            <span>Joined</span>
            <span>Last active</span>
            <span>Progress</span>
          </div>
          {shown.length === 0 ? (
            <EmptyState
              title={members.length ? "No members match" : "No members yet"}
              message={
                members.length
                  ? "Try a different search or show everyone."
                  : "People appear here as soon as they create an account."
              }
            />
          ) : (
            shown.map((member) => {
              const summary = memberSummary(member, courses, progress);
              const open = openId === member.id;
              const isYou = member.id === viewer?.id;
              return (
                <div key={member.id} className={`member-row ${open ? "open" : ""}`}>
                  <button
                    type="button"
                    className="member-main"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : member.id)}
                  >
                    <span className="member-avatar">{initialsOf(member.name)}</span>
                    <span>
                      <b>
                        {member.name}
                        {isYou && <em> (you)</em>}
                      </b>
                      <small>{member.email}</small>
                    </span>
                  </button>
                  <div className="member-role">
                    {canChangeRoles && !isYou ? (
                      <select
                        value={member.role}
                        aria-label={`Role for ${member.name}`}
                        onChange={(event) => setPending({ member, role: event.target.value as Role })}
                      >
                        {(Object.keys(ROLE_LABELS) as Role[]).map((value) => (
                          <option key={value} value={value}>
                            {ROLE_LABELS[value]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`role-badge role-${member.role}`}>{ROLE_LABELS[member.role]}</span>
                    )}
                  </div>
                  <span className="member-cell" data-label="Joined">
                    {timeAgo(member.joinedAt)}
                  </span>
                  <span className="member-cell" data-label="Last active">
                    {timeAgo(summary.lastActive)}
                  </span>
                  <span className="member-cell" data-label="Progress">
                    {plural(summary.lessonsCompleted, "lesson")} · {plural(summary.coursesStarted, "course")}
                  </span>
                  {open && (
                    <div className="member-detail">
                      {summary.courses.length ? (
                        summary.courses.map((course) => (
                          <div key={course.courseId} className="member-course">
                            <b>{course.title}</b>
                            <Meter percent={course.percent} label={`${course.percent}% complete`} />
                            <small>
                              {course.done} of {plural(course.total, "lesson")}
                              {course.finished ? " · Finished" : ""}
                            </small>
                          </div>
                        ))
                      ) : (
                        <p>Has not finished any lessons yet.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </DataState>
      {pending && (
        <ConfirmDialog
          title={`Make ${pending.member.name} ${ROLE_LABELS[pending.role].toLowerCase()}?`}
          confirmLabel="Change role"
          busyLabel="Changing..."
          tone={pending.role === "staff" ? "danger" : "primary"}
          busy={saving}
          onConfirm={() => void confirmRole()}
          onCancel={() => setPending(null)}
        >
          <p>
            {pending.role === "staff"
              ? "Staff can create, edit, and delete every course, and change anyone's role."
              : pending.role === "instructor"
                ? "Instructors can create, edit, and delete courses and see learner progress, but cannot change roles."
                : "They will keep their account and progress but lose access to the staff workspace."}
          </p>
          <p>They may need to sign out and back in to see the change.</p>
        </ConfirmDialog>
      )}
    </StaffShell>
  );
}

export function InstructorWorkspace(props: StaffDashboardProps) {
  const { courses, progress, onNavigate } = props;
  const viewer = useContext(StaffAccountContext);
  const instructors = [...new Set(courses.map((course) => course.instructor))].sort();
  // Instructors start on their own courses when their name matches.
  const [selected, setSelected] = useState(() =>
    viewer && instructors.includes(viewer.name) ? viewer.name : "All instructors",
  );
  const insights = courseInsights(
    selected === "All instructors" ? courses : courses.filter((course) => course.instructor === selected),
    progress,
  );

  return (
    <StaffShell active="instructor" onNavigate={onNavigate}>
      <div className="page-title">
        <div>
          <span className="eyebrow">INSTRUCTOR WORKSPACE</span>
          <h1>Teach with clarity.</h1>
          <p>See where learners are in each course, and which lessons they stop at.</p>
        </div>
        <StaffButton onClick={() => onNavigate("builder")}>Create course</StaffButton>
      </div>
      <DataState {...props}>
        <div className="instructor-bar">
          <label>
            Instructor
            <select value={selected} onChange={(event) => setSelected(event.target.value)}>
              {["All instructors", ...instructors].map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>
        {insights.length === 0 ? (
          <section className="panel">
            <EmptyState
              title="No courses here yet"
              message="Courses taught by this instructor will appear here."
              action={<StaffButton onClick={() => onNavigate("builder")}>Create course</StaffButton>}
            />
          </section>
        ) : (
          <div className="teach-grid">
            {insights.map(({ course, learners, finished, averagePercent, lastActivity }) => {
              const lessons = lessonCompletion(course, progress);
              const published = course.status === "published";
              return (
                <section key={course.id ?? course.title} className="panel teach-card">
                  <div className="teach-head">
                    <img {...courseImageProps(course.image)} alt="" />
                    <div>
                      <div className="course-row-title">
                        <b>{course.title}</b>
                        <span className={`status-badge ${published ? "live" : "draft"}`}>
                          {published ? "Published" : "Draft"}
                        </span>
                      </div>
                      <small>
                        {course.instructor} · last activity {lastActivity ? timeAgo(lastActivity) : "none yet"}
                      </small>
                    </div>
                  </div>
                  <div className="teach-stats">
                    <div>
                      <b>{learners}</b>
                      <small>started</small>
                    </div>
                    <div>
                      <b>{finished}</b>
                      <small>finished</small>
                    </div>
                    <div>
                      <b>{averagePercent}%</b>
                      <small>average progress</small>
                    </div>
                  </div>
                  <div className="lesson-bars">
                    <span className="lesson-bars-title">Learners who finished each lesson</span>
                    {lessons.length === 0 ? (
                      <p className="panel-note compact">This course has no lessons yet.</p>
                    ) : (
                      lessons.map((lesson, index) => (
                        <div key={`${lesson.section}-${lesson.title}`} className="lesson-bar">
                          <span>
                            {index + 1}. {lesson.title}
                          </span>
                          <Meter
                            percent={learners ? (lesson.learners / learners) * 100 : 0}
                            label={`${lesson.learners} of ${learners} learners finished ${lesson.title}`}
                          />
                          <b>{lesson.learners}</b>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="teach-actions">
                    {published && (
                      <StaffButton variant="outline" onClick={() => onNavigate("course", course)}>
                        View
                      </StaffButton>
                    )}
                    <StaffButton variant="outline" onClick={() => onNavigate("builder", course)}>
                      Edit course
                    </StaffButton>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </DataState>
    </StaffShell>
  );
}
