import { createContext, useContext, useState, type ReactNode } from "react";
import { courseImageProps } from "../../imageFallback";

type StaffPage = "admin" | "builder" | "instructor" | "course";

// The signed-in staff member, shown in the staff sidebar.
export type StaffAccount = {
  name: string;
  initials: string;
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
    title: string;
    section: string;
    slides: CourseResource[];
    video?: CourseResource;
    youtubeUrl?: string;
  }[];
};

export type StaffPagesProps = {
  courses: StaffCourse[];
  onNavigate: (page: StaffPage, course?: StaffCourse) => void;
  onSaveCourse: (course: StaffCourse) => Promise<void>;
  onDeleteCourse: (course: StaffCourse) => void;
  editingCourse?: StaffCourse;
};

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
    ["admin", "Overview", "Manage the learning hub"],
    ["instructor", "Instructor workspace", "Create and teach courses"],
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
              onClick={() => {
                onNavigate(page);
                setOpen(false);
              }}
            >
              <span aria-hidden="true">{page === "builder" ? "+" : "•"}</span>
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
                <small>Staff</small>
              </div>
            </div>
          </>
        )}
      </aside>
      <div className="workspace">
        <header className="app-top">
          <button className="app-menu" onClick={() => setOpen(!open)}>
            Menu
          </button>
          <div>
            <span className="status-dot" />
            Staff tools
          </div>
          <button className="top-profile" onClick={() => onNavigate("admin")}>
            {account?.initials}
          </button>
        </header>
        <main className="workspace-main">{children}</main>
      </div>
    </div>
  );
}

export function StaffOverview({
  courses,
  onNavigate,
  onDeleteCourse,
}: StaffPagesProps) {
  return (
    <StaffShell active="admin" onNavigate={onNavigate}>
      <div className="page-title">
        <div>
          <span className="eyebrow">STAFF OVERVIEW</span>
          <h1>Learning hub control center</h1>
          <p>Manage courses, instructors, and student learning experiences.</p>
        </div>
        <StaffButton onClick={() => onNavigate("builder")}>
          Create new course
        </StaffButton>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Published courses</h2>
            <p>Everything learners can see right now.</p>
          </div>
          <StaffButton
            variant="outline"
            onClick={() => onNavigate("instructor")}
          >
            Open instructor workspace
          </StaffButton>
        </div>
        {courses.map((course) => (
          <div className="skill-row" key={course.title}>
            <img {...courseImageProps(course.image)} alt="" />
            <div>
              <b>{course.title}</b>
              <span>
                {course.category} · {course.level} · {course.lessons}{" "}
                {course.lessons === 1 ? "lesson" : "lessons"}
              </span>
            </div>
            <StaffButton
              variant="outline"
              onClick={() => onNavigate("course", course)}
            >
              View
            </StaffButton>
            <StaffButton
              variant="outline"
              onClick={() => onNavigate("builder", course)}
            >
              Edit
            </StaffButton>
            <StaffButton variant="outline" onClick={() => onDeleteCourse(course)}>
              Delete
            </StaffButton>
          </div>
        ))}
      </section>
    </StaffShell>
  );
}

export function InstructorWorkspace({
  courses,
  onNavigate,
  onDeleteCourse,
}: StaffPagesProps) {
  const [selectedInstructor, setSelectedInstructor] = useState("All instructors");
  const instructors = ["All instructors", ...new Set(courses.map((course) => course.instructor))];
  const assignedCourses =
    selectedInstructor === "All instructors"
      ? courses
      : courses.filter((course) => course.instructor === selectedInstructor);

  return (
    <StaffShell active="instructor" onNavigate={onNavigate}>
      <div className="page-title">
        <div>
          <span className="eyebrow">INSTRUCTOR WORKSPACE</span>
          <h1>Teach with clarity.</h1>
          <p>Organize your curriculum and keep every practical lesson moving.</p>
        </div>
        <StaffButton onClick={() => onNavigate("builder")}>
          Create course
        </StaffButton>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Instructor assignments</h2>
            <p>Filter courses by the instructor responsible for delivery.</p>
          </div>
          <select
            value={selectedInstructor}
            onChange={(event) => setSelectedInstructor(event.target.value)}
            aria-label="Filter by instructor"
          >
            {instructors.map((instructor) => (
              <option key={instructor}>{instructor}</option>
            ))}
          </select>
        </div>
        {assignedCourses.map((course) => (
          <div className="skill-row" key={course.title}>
            <img {...courseImageProps(course.image)} alt="" />
            <div>
              <b>{course.title}</b>
              <span>
                Instructor: {course.instructor} · {course.sections.length} sections
              </span>
            </div>
            <StaffButton
              variant="outline"
              onClick={() => onNavigate("course", course)}
            >
              View
            </StaffButton>
            <StaffButton
              variant="outline"
              onClick={() => onNavigate("builder", course)}
            >
              Edit
            </StaffButton>
            <StaffButton variant="outline" onClick={() => onDeleteCourse(course)}>
              Delete
            </StaffButton>
          </div>
        ))}
      </section>
    </StaffShell>
  );
}
