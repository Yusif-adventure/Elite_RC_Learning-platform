import { useEffect, useMemo, useState, type ReactNode } from "react";
import { courseImageProps, personImageProps } from "./imageFallback";
import type { User } from "@supabase/supabase-js";
import {
  InstructorWorkspace,
  StaffAccountContext,
  StaffCoursePreview,
  StaffOverview,
} from "./features/staff/StaffPages";
import { CourseBuilderPage } from "./features/staff/CourseBuilderPage";
import type { CourseResource, StaffCourse } from "./features/staff/StaffPages";
import {
  API_URL,
  createCourse,
  removeCourse,
  updateCourse,
} from "./features/staff/courseApi";
import { supabase } from "./supabaseClient";

type Page =
  | "home"
  | "about"
  | "explore"
  | "course"
  | "dashboard"
  | "lesson"
  | "progress"
  | "admin"
  | "builder"
  | "preview"
  | "instructor"
  | "auth"
  | "reset-password"
  | "profile";
type IconName =
  | "plane"
  | "search"
  | "book"
  | "clock"
  | "play"
  | "arrow"
  | "check"
  | "download"
  | "menu"
  | "close"
  | "user"
  | "grid"
  | "chart"
  | "plus"
  | "edit"
  | "eye"
  | "trash"
  | "upload"
  | "video"
  | "image"
  | "file"
  | "chevron"
  | "car"
  | "boat"
  | "chip"
  | "bot"
  | "wifi";

const hero =
  "https://images.unsplash.com/photo-1671966952010-d6befd39cdb2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1600";
const courseImages = [
  hero,
  "https://images.unsplash.com/photo-1614788888074-ccc3d721da27?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=80&w=1000",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1566847438217-76e82d383f84?auto=format&fit=crop&w=1000&q=80",
];

const initialCourses: StaffCourse[] = [
  {
    title: "Introduction to RC Planes",
    desc: "Learn the parts, principles, and safe setup of your first radio-controlled aircraft.",
    level: "Beginner",
    lessons: 12,
    duration: "2h 45m",
    instructor: "Daniel Mensah",
    image: courseImages[0],
    category: "RC Planes",
    objectives: [
      "Identify the main parts of a radio-controlled aircraft",
      "Explain the basic forces that keep an aircraft flying",
      "Choose compatible aircraft electronics",
      "Prepare for a safe first flight",
    ],
    sections: [
      "Getting to Know RC Aircraft",
      "Electronics & Control Systems",
      "Your First Setup",
      "Preparing to Fly",
    ],
    sampleLessons: [
      "Welcome to the workshop",
      "Anatomy of an RC Plane",
      "How an aircraft stays in the air",
    ],
  },
  {
    title: "Transmitters & Receivers",
    desc: "Master radio links, channels, binding, range checks, and failsafe configuration.",
    level: "Beginner",
    lessons: 8,
    duration: "1h 50m",
    instructor: "Sarah Owusu",
    image: courseImages[1],
    category: "Electronics",
    objectives: [
      "Explain how a transmitter communicates with a receiver",
      "Identify common radio control channels",
      "Bind a transmitter and receiver",
      "Perform a range check and configure failsafe",
    ],
    sections: [
      "Radio Control Basics",
      "Transmitters & Channels",
      "Binding and Setup",
      "Range Checks & Failsafe",
    ],
    sampleLessons: [
      "Welcome to radio control",
      "Understanding channels",
      "Binding your receiver",
    ],
  },
  {
    title: "Motors, ESCs & Batteries",
    desc: "Build a reliable electric power system and understand every connection.",
    level: "Intermediate",
    lessons: 10,
    duration: "2h 20m",
    instructor: "Kwame Boateng",
    image: courseImages[2],
    category: "Electronics",
    objectives: [
      "Compare brushed and brushless motors",
      "Match an ESC to a motor and battery",
      "Understand battery voltage and capacity ratings",
      "Assemble a safe electric power system",
    ],
    sections: [
      "Electric Power Fundamentals",
      "Motors & Propulsion",
      "ESCs and Configuration",
      "Batteries & Safe Operation",
    ],
    sampleLessons: [
      "Power system overview",
      "Choosing a motor",
      "ESC and battery compatibility",
    ],
  },
  {
    title: "Introduction to RC Cars",
    desc: "From chassis geometry to suspension tuning and confident first drives.",
    level: "Beginner",
    lessons: 9,
    duration: "2h 05m",
    instructor: "Nana Asare",
    image: courseImages[3],
    category: "RC Cars",
    objectives: [
      "Identify the main components of an RC car",
      "Understand steering and drivetrain basics",
      "Set up suspension for predictable handling",
      "Complete a safe pre-drive inspection",
    ],
    sections: [
      "RC Car Fundamentals",
      "Chassis & Drivetrain",
      "Steering & Suspension",
      "Your First Drive",
    ],
    sampleLessons: [
      "Welcome to RC cars",
      "Chassis and drivetrain basics",
      "Steering and control",
    ],
  },
  {
    title: "Fundamentals of RC Boats",
    desc: "Propulsion, waterproofing, balance, and safe operation on the water.",
    level: "Beginner",
    lessons: 7,
    duration: "1h 40m",
    instructor: "Maya Cole",
    image: courseImages[4],
    category: "RC Boats",
    objectives: [
      "Identify the major parts of an RC boat",
      "Understand hull balance and propulsion",
      "Protect electronics from water",
      "Prepare for safe operation on the water",
    ],
    sections: [
      "Getting Started with RC Boats",
      "Hull, Balance & Propulsion",
      "Waterproofing Electronics",
      "Safe Operation & Care",
    ],
    sampleLessons: [
      "Welcome to RC boating",
      "Hull and propulsion basics",
      "Waterproofing your model",
    ],
  },
];

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const p: Record<IconName, ReactNode> = {
    plane: (
      <>
        <path d="m3 14 8-3 3-8 2 1-1 7 6 2v2l-6 1-1 5-2-1v-4l-9 1z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 5 5" />
      </>
    ),
    book: (
      <>
        <path d="M4 5a3 3 0 0 1 3-2h5v17H7a3 3 0 0 0-3 2zM20 5a3 3 0 0 0-3-2h-5v17h5a3 3 0 0 1 3 2z" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6l4 2" />
      </>
    ),
    play: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8 6 4-6 4z" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M15 8l4 4-4 4" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    download: (
      <>
        <path d="M12 3v12m-4-4 4 4 4-4M5 20h14" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    edit: (
      <>
        <path d="m4 16-1 5 5-1L19 9l-4-4zM13 7l4 4" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m-4 4 4-4 4 4M4 15v6h16v-6" />
      </>
    ),
    video: (
      <>
        <rect x="3" y="5" width="14" height="14" rx="2" />
        <path d="m17 10 5-3v10l-5-3" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m3 17 5-5 4 4 3-3 6 6" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h8l4 4v16H6zM14 2v5h5" />
        <path d="M9 13h6M9 17h6" />
      </>
    ),
    chevron: <path d="m8 10 4 4 4-4" />,
    car: (
      <>
        <path d="m5 16-2-2 2-6h14l2 6-2 2z" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </>
    ),
    boat: (
      <>
        <path d="m3 14 4 6h10l4-6-9-3zM12 11V3l5 6z" />
      </>
    ),
    chip: (
      <>
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M18 9h4M2 15h4M18 15h4" />
      </>
    ),
    bot: (
      <>
        <rect x="4" y="7" width="16" height="13" rx="3" />
        <path d="M12 3v4M8 12h.01M16 12h.01M8 16h8" />
      </>
    ),
    wifi: (
      <>
        <path d="M4 9a12 12 0 0 1 16 0M7 13a8 8 0 0 1 10 0M10 17a3 3 0 0 1 4 0M12 21h.01" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {p[name]}
    </svg>
  );
}

function Button({
  children,
  variant = "primary",
  icon,
  onClick,
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost" | "danger";
  icon?: IconName;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={`btn ${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <Icon name={icon} size={17} />}
      <span>{children}</span>
    </button>
  );
}

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <button
      className={`brand ${dark ? "dark" : ""}`}
      onClick={() => go("home")}
    >
      <span className="brand-mark">
        <Icon name="plane" size={22} />
      </span>
      <span>
        <b>ELITE RC</b>
        <small>LEARNING HUB</small>
      </span>
    </button>
  );
}

type Course = StaffCourse;
type LessonSelection = { course: Course; lessonIndex: number };

function memberName(user: User) {
  return String(
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Member",
  );
}

// Staff are marked in app_metadata, which members cannot change themselves.
// The backend checks this again before accepting any course change.
function isStaff(user?: User | null) {
  return user?.app_metadata?.role === "staff";
}

const STAFF_PAGES: Page[] = ["admin", "builder", "preview", "instructor"];

function memberInitials(user: User) {
  return memberName(user)
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

let courses: Course[] = initialCourses;

function getFeaturedCourses() {
  const createdCourses = courses.filter(
    (course) =>
      !initialCourses.some((initial) => initial.title === course.title),
  );
  return [...createdCourses, ...courses]
    .filter(
      (course, index, list) =>
        list.findIndex((item) => item.title === course.title) === index,
    )
    .slice(0, 3);
}

function asResource(resource: CourseResource | string): CourseResource {
  return typeof resource === "string"
    ? { name: resource, url: resource }
    : resource;
}

function normalizeLink(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^https?\/\//i.test(trimmed))
    return trimmed.replace(/^https?/i, "https:");
  return `https://${trimmed}`;
}

let navigate: (
  page: Page,
  course?: Course,
  lessonIndex?: number,
) => void = () => {};
function go(page: Page, course?: Course, lessonIndex?: number) {
  navigate(page, course, lessonIndex);
}

function PublicHeader({
  active,
  user,
  onSignOut,
}: {
  active?: Page;
  user?: User | null;
  onSignOut?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="public-header">
      <Logo dark />
      <nav className={open ? "open" : ""}>
        <button
          className={active === "home" ? "active" : ""}
          onClick={() => go("home")}
        >
          Home
        </button>
        <button
          className={active === "explore" ? "active" : ""}
          onClick={() => go("explore")}
        >
          Explore Courses
        </button>
        {user && (
          <button onClick={() => go("dashboard")}>Student Space</button>
        )}
        {isStaff(user) && (
          <button onClick={() => go("admin")}>Staff Workspace</button>
        )}
        <button
          className={active === "about" ? "active" : ""}
          onClick={() => go("about")}
        >
          About Us
        </button>
        {user && onSignOut ? (
          <Button variant="outline" onClick={onSignOut}>
            Sign Out
          </Button>
        ) : (
          <Button variant="outline" onClick={() => go("auth")}>
            Sign In
          </Button>
        )}
      </nav>
      <button className="menu-btn" onClick={() => setOpen(!open)}>
        <Icon name={open ? "close" : "menu"} />
      </button>
    </header>
  );
}

function CourseCard({ course, index = 0 }: { course: Course; index?: number }) {
  return (
    <article className="course-card" onClick={() => go("course", course)}>
      <div className="course-image">
        <img {...courseImageProps(course.image)} alt={`${course.title} course cover`} />
        <span className="badge">{course.level}</span>
      </div>
      <div className="course-body">
        <span className="category">{course.category}</span>
        <h3>{course.title}</h3>
        <p>{course.desc}</p>
        <div className="course-meta">
          <span>
            <Icon name="user" size={15} />
            {course.instructor}
          </span>
          <span>
            <Icon name="book" size={15} />
            {course.lessons} {course.lessons === 1 ? "lesson" : "lessons"}
          </span>
        </div>
        <Button variant={index === 0 ? "primary" : "outline"}>
          View Course <Icon name="arrow" size={16} />
        </Button>
      </div>
    </article>
  );
}

function Home({
  user,
  onSignOut,
}: {
  user?: User | null;
  onSignOut?: () => void;
}) {
  const cats: [IconName, string, string][] = [
    ["plane", "RC Planes", "Aerodynamics & flight"],
    ["car", "RC Cars", "Speed & control"],
    ["boat", "RC Boats", "Marine engineering"],
    ["chip", "Electronics", "Power & circuits"],
    ["bot", "Robotics", "Build intelligent machines"],
    ["wifi", "IoT", "Connected projects"],
  ];
  return (
    <>
      <PublicHeader active="home" user={user} onSignOut={onSignOut} />
      <main className="public-main">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">ENGINEERING STARTS WITH CURIOSITY</span>
            <h1>
              Learn. Build. <em>Fly.</em>
            </h1>
            <p>
              Practical, step-by-step learning for the next generation of RC
              pilots, makers, and engineers.
            </p>
            <div className="hero-actions">
              <Button onClick={() => go("explore")}>
                Explore Courses <Icon name="arrow" />
              </Button>
              <Button variant="outline" onClick={() => go("auth")}>
                Join the Community
              </Button>
            </div>
            <div className="hero-proof">
              <span className="avatar-stack">
                <i>DM</i>
                <i>SO</i>
                <i>KB</i>
              </span>
              <p>
                <b>1,200+ builders</b>
                <br />
                learning across Africa
              </p>
            </div>
          </div>
          <div className="hero-media">
            <img
              {...courseImageProps(hero)}
              alt="A radio controlled aircraft flying in a clear sky"
            />
            <div className="flight-card">
              <span>
                <Icon name="plane" />
              </span>
              <div>
                <b>Flight fundamentals</b>
                <small>Start with zero experience</small>
              </div>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">START YOUR JOURNEY</span>
              <h2>Featured courses</h2>
            </div>
            <button className="text-link" onClick={() => go("explore")}>
              View all courses <Icon name="arrow" size={16} />
            </button>
          </div>
          <div className="course-grid">
            {getFeaturedCourses().map((c, i) => (
              <CourseCard course={c} index={i} key={c.title} />
            ))}
          </div>
        </section>
        <section className="category-section">
          <div className="section-head">
            <div>
              <span className="eyebrow light">EXPLORE THE WORKSHOP</span>
              <h2>What will you build next?</h2>
            </div>
          </div>
          <div className="category-grid">
            {cats.map(([icon, title, sub]) => (
              <button key={title} onClick={() => go("explore")}>
                <i>
                  <Icon name={icon} />
                </i>
                <span>
                  <b>{title}</b>
                  <small>{sub}</small>
                </span>
                <Icon name="arrow" size={16} />
              </button>
            ))}
          </div>
        </section>
        <section className="why">
          <div>
            <span className="eyebrow">WHY ELITE RC</span>
            <h2>Engineering made tangible.</h2>
            <p>
              We turn complex systems into guided, hands-on learning that builds
              confidence from the first lesson.
            </p>
          </div>
          <div className="why-grid">
            {[
              [
                "01",
                "Learn by doing",
                "Every course leads to a practical build or setup.",
              ],
              [
                "02",
                "Taught by builders",
                "Clear guidance from experienced RC enthusiasts.",
              ],
              [
                "03",
                "Grow together",
                "Share questions and progress with a curious community.",
              ],
            ].map((x) => (
              <article key={x[0]}>
                <span>{x[0]}</span>
                <h3>{x[1]}</h3>
                <p>{x[2]}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Footer() {
  return (
    <footer>
      <Logo />
      <p>Building Africa's next generation of practical engineers.</p>
      <div>
        <button onClick={() => go("explore")}>Courses</button>
        <button onClick={() => go("about")}>About</button>
      </div>
      <small>© 2025 ELITE RC Community. Learn boldly.</small>
    </footer>
  );
}

function Explore({
  user,
  onSignOut,
}: {
  user?: User | null;
  onSignOut?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [difficulty, setDifficulty] = useState("All levels");
  const filtered = useMemo(
    () =>
      courses.filter(
        (c) =>
          (filter === "All" || c.category === filter) &&
          (difficulty === "All levels" || c.level === difficulty) &&
          `${c.title} ${c.desc} ${c.category}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ),
    [search, filter, difficulty],
  );
  return (
    <>
      <PublicHeader active="explore" user={user} onSignOut={onSignOut} />
      <main className="catalog">
        <div className="catalog-head">
          <span className="eyebrow">COURSE LIBRARY</span>
          <h1>Build knowledge. Create anything.</h1>
          <p>
            Explore practical courses designed to take you from curious beginner
            to confident builder.
          </p>
        </div>
        <div className="catalog-tools">
          <label className="search">
            <Icon name="search" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses, topics, or skills..."
            />
          </label>
          <div className="filters" aria-label="Filter by category">
            {["All", "RC Planes", "RC Cars", "RC Boats", "Electronics"].map(
              (f) => (
                <button
                  className={filter === f ? "active" : ""}
                  onClick={() => setFilter(f)}
                  key={f}
                >
                  {f}
                </button>
              ),
            )}
          </div>
          <select
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option>All levels</option>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>
        <div className="results-head">
          <b>{filtered.length} courses</b>
          <span>Showing practical learning paths</span>
        </div>
        {filtered.length ? (
          <div className="course-grid">
            {filtered.map((c, i) => (
              <CourseCard course={c} index={i} key={c.title} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <Icon name="search" size={32} />
            <h2>No courses found</h2>
            <p>Try a different keyword or clear your filters.</p>
            <Button
              onClick={() => {
                setSearch("");
                setFilter("All");
                setDifficulty("All levels");
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function About({ user, onSignOut }: { user?: User | null; onSignOut?: () => void }) {
  return (
    <>
      <PublicHeader active="about" user={user} onSignOut={onSignOut} />
      <main className="public-main">
        <section className="hero about-hero">
          <div className="hero-copy">
            <span className="eyebrow">ABOUT ELITE RC</span>
            <h1>Practical engineering, made accessible.</h1>
            <p>
              Elite RC helps curious builders learn by doing, with clear lessons
              for aircraft, vehicles, electronics, and connected projects.
            </p>
          </div>
          <div className="hero-media">
            <img {...courseImageProps(hero)} alt="A radio controlled aircraft in flight" />
          </div>
        </section>
        <section className="why">
          <div>
            <span className="eyebrow">HOW WE TEACH</span>
            <h2>Build confidence through real projects.</h2>
            <p>
              Every learning path breaks complex systems into useful steps, so
              members can understand the principles and apply them in the workshop.
            </p>
          </div>
          <div className="why-grid">
            <article>
              <span>01</span>
              <h3>Learn clearly</h3>
              <p>Focused explanations and practical resources keep every lesson moving.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Build bravely</h3>
              <p>Hands-on projects turn theory into skills you can use and share.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Grow together</h3>
              <p>A shared course library gives builders a place to keep progressing.</p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function CourseDetails({
  course,
  user,
  onSignOut,
}: {
  course: Course;
  user?: User | null;
  onSignOut?: () => void;
}) {
  const [open, setOpen] = useState(0);
  const lessonContent = course.lessonContent ?? [];
  const lessonsForSection = (section: string) =>
    lessonContent.filter((lesson) => lesson.section === section);
  return (
    <>
      <PublicHeader user={user} onSignOut={onSignOut} />
      <main className="details">
        <button className="crumb" onClick={() => go("explore")}>
          Explore Courses / {course.category} / <b>{course.title}</b>
        </button>
        <section className="details-hero">
          <div>
            <span className="badge blue">
              {course.level.toUpperCase()} • {course.category.toUpperCase()}
            </span>
            <h1>{course.title}</h1>
            <p>{course.desc}</p>
            <div className="instructor">
              <img
                {...personImageProps(course.instructorImage)}
                alt={course.instructor}
                className="instructor-avatar"
              />
              <div>
                <small>COURSE INSTRUCTOR</small>
                <b>{course.instructor}</b>
              </div>
            </div>
            <Button onClick={() => go("lesson", course)}>
              Start Learning <Icon name="arrow" />
            </Button>
          </div>
          <img {...courseImageProps(course.image)} alt={course.title} />
        </section>
        <section className="details-grid">
          <div>
            <article className="content-card">
              <h2>What you'll learn</h2>
              <div className="objectives">
                {course.objectives.map((item) => (
                  <p key={item}>
                    <i>
                      <Icon name="check" size={15} />
                    </i>
                    {item}
                  </p>
                ))}
              </div>
            </article>
            <article className="content-card curriculum">
              <div className="card-title">
                <div>
                  <span className="eyebrow">COURSE CURRICULUM</span>
                  <h2>
                    {course.lessons} lessons · {course.sections.length} sections
                  </h2>
                </div>
                <span>{course.duration} total</span>
              </div>
              {course.sections.map((section, index) => (
                <div className="module" key={section}>
                  <button onClick={() => setOpen(index)}>
                    <span>
                      <b>0{index + 1}</b>
                      <strong>{section}</strong>
                    </span>
                    <Icon name="chevron" />
                  </button>
                  {open === index && (
                    <div className="lesson-list">
                      {lessonsForSection(section).length === 0 && (
                        <p>Lessons coming soon.</p>
                      )}
                      {lessonsForSection(section).map((lesson) => {
                        return (
                          <button
                            onClick={() =>
                              go(
                                "lesson",
                                course,
                                lessonContent.indexOf(lesson),
                              )
                            }
                            key={lesson.title}
                          >
                            <Icon name="play" size={17} />
                            <span>
                              {lesson.title}
                              <small>OPEN LESSON</small>
                            </span>
                            <em>Open</em>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </article>
          </div>
          <aside className="course-facts">
            <h3>Course at a glance</h3>
            <p>
              <Icon name="book" />
              <span>
                <small>LESSONS</small>
                <b>{course.lessons} practical lessons</b>
              </span>
            </p>
            <p>
              <Icon name="clock" />
              <span>
                <small>DURATION</small>
                <b>{course.duration}</b>
              </span>
            </p>
            <p>
              <Icon name="chart" />
              <span>
                <small>DIFFICULTY</small>
                <b>{course.level}</b>
              </span>
            </p>
            <hr />
            <Button onClick={() => go("lesson", course)}>Start Learning</Button>
          </aside>
        </section>
      </main>
    </>
  );
}

const studentNav: [Page, IconName, string][] = [
  ["dashboard", "grid", "Dashboard"],
  ["explore", "search", "Explore Courses"],
  ["course", "book", "My Learning"],
  ["progress", "chart", "Progress"],
  ["profile", "user", "Profile"],
];
function AppShell({
  children,
  active,
  user,
  onSignOut,
}: {
  children: ReactNode;
  active: Page;
  user: User;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={`side ${open ? "open" : ""}`}>
        <Logo />
        <div className="side-label">STUDENT SPACE</div>
        <nav>
          {studentNav.map(([page, icon, label]) => (
            <button
              key={label}
              className={active === page ? "active" : ""}
              onClick={() => {
                go(page);
                setOpen(false);
              }}
            >
              <Icon name={icon} />
              {label}
            </button>
          ))}
          {isStaff(user) && (
            <button onClick={() => go("admin")}>
              <Icon name="grid" />
              Staff Workspace
            </button>
          )}
        </nav>
        <div className="side-user">
          <span>{memberInitials(user)}</span>
          <div>
            <b>{memberName(user)}</b>
            <small>{isStaff(user) ? "Staff" : "Member"}</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="app-top">
          <button className="app-menu" onClick={() => setOpen(!open)}>
            <Icon name="menu" />
          </button>
          <div>
            <span className="status-dot" />
            Signed in as {user.email}
          </div>
          <button className="top-profile" onClick={() => go("profile")}>
            <span>{memberInitials(user)}</span>
            <Icon name="chevron" size={16} />
          </button>
        </header>
        <main className="workspace-main">{children}</main>
      </div>
    </div>
  );
}

function Dashboard({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  return (
    <AppShell active="dashboard" user={user} onSignOut={onSignOut}>
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR LEARNING</span>
          <h1>Welcome back, {memberName(user)}.</h1>
          <p>You're building real engineering skills—one lesson at a time.</p>
        </div>
      </div>
      <section className="continue-card">
        <img {...courseImageProps(courses[0].image)} alt="" />
        <div>
          <span className="badge">START HERE</span>
          <h2>{courses[0].title}</h2>
          <p>{courses[0].desc}</p>
          <small>
            {courses[0].lessons} lessons · {courses[0].duration}
          </small>
          <Button onClick={() => go("course", courses[0])}>
            View course <Icon name="arrow" />
          </Button>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Learning rhythm</h2>
            <p>A simple way to keep your workshop practice moving.</p>
          </div>
          <span className="badge blue">YOUR FOCUS</span>
        </div>
        <div className="dashboard-overview">
          <article>
            <span className="eyebrow">EXPLORE</span>
            <h3>{courses.length} courses to choose from</h3>
            <p>Browse the catalog and pick the next idea you want to turn into something you can build.</p>
          </article>
          <article>
            <span className="eyebrow">WORKSHOP NOTE</span>
            <h3>Small sessions add up.</h3>
            <p>Set aside a little time to review, practice, and return to your project with a clearer eye.</p>
          </article>
        </div>
      </section>
    </AppShell>
  );
}

function Lesson({ course, lessonIndex }: LessonSelection) {
  const [started, setStarted] = useState(false);
  const lessonTitle =
    course.lessonContent?.[lessonIndex]?.title ||
    course.sampleLessons[lessonIndex] ||
    course.sampleLessons[0];
  const lesson = course.lessonContent?.[lessonIndex];
  return (
    <div className="lesson-shell">
      <header className="lesson-top">
        <Logo dark />
        <button className="crumb" onClick={() => go("course", course)}>
          {course.title}
        </button>
        <span>
          Lesson {lessonIndex + 1} of {course.lessons}
        </span>
      </header>
      <main className="lesson-content">
        <span className="eyebrow">
          {course.category.toUpperCase()} ·{" "}
          {started ? `LESSON ${lessonIndex + 1}` : "OVERVIEW"}
        </span>
        <h1>{started ? lessonTitle : `Welcome to ${course.title}`}</h1>
        <p className="lead">
          {started
            ? `Work through this lesson in ${course.title.toLowerCase()} and use the attached resources as you build.`
            : `Start building your foundation with this practical introduction to ${course.title.toLowerCase()}.`}
        </p>
        <article className="content-card">
          {started ? (
            <>
              <h2>{lesson?.title || lessonTitle}</h2>
              <p>
                This lesson is part of the{" "}
                {lesson?.section || "course curriculum"} section.
              </p>
              {lesson?.slides.length ? (
                <div className="lesson-resource">
                  <b>Slides</b>
                  {lesson.slides.map((slide) => {
                    const resource = asResource(slide);
                    return (
                      <a
                        href={resource.url}
                        download={resource.name}
                        target="_blank"
                        rel="noreferrer"
                        key={resource.name}
                      >
                        {resource.name} · Open slides
                      </a>
                    );
                  })}
                </div>
              ) : null}
              {lesson?.video ? (
                <div className="lesson-resource">
                  <b>Short video preview</b>
                  {typeof lesson.video === "string" ? (
                    <a href={lesson.video} target="_blank" rel="noreferrer">
                      Open preview clip
                    </a>
                  ) : (
                    <video controls preload="metadata" src={lesson.video.url}>
                      Your browser does not support video playback.
                    </video>
                  )}
                  {lesson.youtubeUrl && (
                    <a
                      className="full-video-link"
                      href={normalizeLink(lesson.youtubeUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Watch the full video on YouTube
                    </a>
                  )}
                </div>
              ) : null}
              {!lesson?.video && lesson?.youtubeUrl ? (
                <div className="lesson-resource">
                  <b>Full lesson video</b>
                  <a
                    className="full-video-link"
                    href={normalizeLink(lesson.youtubeUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Watch the full video on YouTube
                  </a>
                </div>
              ) : null}
              {!lesson && (
                <p>Lesson resources will be added by the instructor.</p>
              )}
            </>
          ) : (
            <>
              <h2>Lesson overview</h2>
              <p>
                In this lesson, you will learn the essential ideas, equipment,
                and safety practices needed to continue confidently through the
                course.
              </p>
              <div className="objectives">
                {course.objectives.slice(0, 3).map((objective) => (
                  <p key={objective}>
                    <i>
                      <Icon name="check" size={15} />
                    </i>
                    {objective}
                  </p>
                ))}
              </div>
            </>
          )}
        </article>
        <div className="lesson-nav">
          <Button variant="outline" onClick={() => go("course", course)}>
            Back to course
          </Button>
          {!started && (
            <Button onClick={() => setStarted(true)}>
              Start lesson <Icon name="arrow" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function ProgressPage({
  user,
  onSignOut,
}: {
  user: User;
  onSignOut: () => void;
}) {
  return (
    <AppShell active="progress" user={user} onSignOut={onSignOut}>
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR LEARNING</span>
          <h1>Progress & achievements</h1>
          <p>Track the practical skills you're building.</p>
        </div>
      </div>
      <section className="panel">
        <h2>Courses</h2>
        <p>Lesson progress tracking is coming soon. For now, open any course to keep learning.</p>
        {courses.slice(0, 3).map((course) => (
          <div className="skill-row" key={course.title}>
            <img {...courseImageProps(course.image)} alt="" />
            <div>
              <b>{course.title}</b>
              <span>
                {course.lessons} lessons · {course.level}
              </span>
            </div>
            <Button variant="outline" onClick={() => go("course", course)}>
              View course
            </Button>
          </div>
        ))}
      </section>
    </AppShell>
  );
}

function Auth() {
  const [register, setRegister] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  useEffect(() => {
    if (resetCooldown === 0) return;
    const timer = window.setInterval(() => {
      setResetCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resetCooldown]);

  const submit = async () => {
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      if (forgotPassword) {
        if (resetCooldown > 0) return;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: window.location.origin },
        );
        if (resetError) throw resetError;
        setMessage("Check your email for a password reset link. If you don't see it, check your spam folder.");
        setResetCooldown(30);
        return;
      }
      const result = register
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { full_name: fullName.trim() } },
          })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
      if (result.error) throw result.error;
      if (result.data.session) {
        go(isStaff(result.data.session.user) ? "admin" : "dashboard");
      } else {
        setMessage(
          "Account created. Check your email to confirm your account, then sign in.",
        );
        setRegister(false);
      }
    } catch (authError) {
      const errorMessage =
        authError instanceof Error
          ? authError.message
          : "Authentication failed. Please try again.";
      if (forgotPassword && /rate limit|too many requests/i.test(errorMessage)) {
        setResetCooldown(60);
        setError("Supabase has temporarily limited reset emails. Wait a few minutes before trying again.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <section>
        <Logo />
        <div>
          <span className="eyebrow light">WELCOME TO THE WORKSHOP</span>
          <h1>Build skills that move.</h1>
          <p>
            Join curious makers learning to design, build, and fly with
            confidence.
          </p>
        </div>
        <small>ELITE RC COMMUNITY</small>
      </section>
      <main>
        <button className="auth-back" onClick={() => go("home")}>
          ← Back to home
        </button>
        <div className="auth-card">
          <span className="eyebrow">
            {forgotPassword
              ? "RESET YOUR PASSWORD"
              : register
                ? "JOIN THE COMMUNITY"
                : "WELCOME BACK"}
          </span>
          <h2>
            {forgotPassword
              ? "Forgot your password?"
              : register
                ? "Create your account"
                : "Sign in to continue"}
          </h2>
          <p>
            {forgotPassword
              ? "Enter your email and we will send you a secure reset link."
              : "Use your member account to continue learning."}
          </p>
          {register && !forgotPassword && (
            <label>
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="you@example.com"
              required
            />
          </label>
          {!forgotPassword && <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="At least 8 characters"
              minLength={6}
              required
            />
          </label>}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
          <Button
            className="wide"
            onClick={() => void submit()}
            disabled={forgotPassword && resetCooldown > 0}
          >
            {forgotPassword
              ? resetCooldown > 0
                ? `Send again in ${resetCooldown}s`
                : "Send reset link"
              : register
                ? "Create account"
                : "Sign in"}
          </Button>
          {!register && !forgotPassword && (
            <button
              className="forgot"
              onClick={() => {
                setError("");
                setMessage("");
                setForgotPassword(true);
              }}
            >
              Forgot password?
            </button>
          )}
          <p className="switch">
            <button
              onClick={() => {
                setError("");
                setMessage("");
                setForgotPassword(false);
                setRegister(!register);
              }}
            >
              {forgotPassword
                ? "Back to sign in"
                : register
                  ? "Sign in"
                  : "Create an account"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const updatePassword = async () => {
    setError("");
    setMessage("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage("Your password has been updated successfully. You can now log in with your new password.");
  };

  return (
    <div className="auth">
      <section>
        <Logo />
        <div>
          <span className="eyebrow light">WELCOME BACK</span>
          <h1>Keep building.</h1>
          <p>Set a new password and return to your learning space.</p>
        </div>
        <small>ELITE RC COMMUNITY</small>
      </section>
      <main>
        <div className="auth-card">
          <span className="eyebrow">NEW PASSWORD</span>
          <h2>Choose a new password</h2>
          <p>Use at least 6 characters for your new password.</p>
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              minLength={6}
            />
          </label>
          {error && <p role="alert" className="form-error">{error}</p>}
          {message && <p role="status">{message}</p>}
          {!message ? (
            <Button className="wide" onClick={() => void updatePassword()}>
              Update password
            </Button>
          ) : (
            <Button className="wide" onClick={() => go("dashboard")}>
              Continue learning
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function ProfilePage({
  user,
  onSignOut,
}: {
  user: User;
  onSignOut: () => void;
}) {
  return (
    <AppShell active="profile" user={user} onSignOut={onSignOut}>
      <div className="page-title">
        <div>
          <span className="eyebrow">ACCOUNT</span>
          <h1>Your profile</h1>
          <p>Manage your learning profile.</p>
        </div>
      </div>
      <section className="panel profile-panel">
        <div className="profile-cover" />
        <div className="profile-main">
          <span className="profile-avatar">{memberInitials(user)}</span>
          <div>
            <h2>{memberName(user)}</h2>
            <p>{isStaff(user) ? "Staff" : "Member"}</p>
          </div>
        </div>
        <div className="profile-form">
          <label>
            Full name
            <input defaultValue={memberName(user)} readOnly />
          </label>
          <label>
            Email address
            <input defaultValue={user.email || ""} readOnly />
          </label>
          <Button onClick={onSignOut}>Sign out</Button>
        </div>
      </section>
    </AppShell>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [selectedCourse, setSelectedCourse] = useState<Course>(courses[0]);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course>();
  const [courseVersion, refreshCourses] = useState(0);
  const [courseLoadState, setCourseLoadState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [courseLoadError, setCourseLoadError] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setUser(data.session?.user ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (active) setUser(session?.user ?? null);
      if (active && event === "PASSWORD_RECOVERY") setPage("reset-password");
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPage("home");
  };

  useEffect(() => {
    let active = true;

    async function fetchCourses() {
      try {
        const response = await fetch(`${API_URL}/api/courses`);
        if (!response.ok) {
          throw new Error(`Course service returned ${response.status}.`);
        }
        const payload: { courses?: Course[] } = await response.json();
        if (!Array.isArray(payload.courses)) {
          throw new Error("Course service returned an invalid response.");
        }
        if (!active) return;
        courses = payload.courses;
        if (courses.length > 0) setSelectedCourse(courses[0]);
        setCourseLoadState("ready");
        setCourseLoadError("");
        refreshCourses((version) => version + 1);
      } catch (error) {
        if (!active) return;
        setCourseLoadState("error");
        setCourseLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load shared courses.",
        );
        refreshCourses((version) => version + 1);
      }
    }

    fetchCourses();
    return () => {
      active = false;
    };
  }, []);

  const saveCourse = async (course: Course) => {
    // The builder has no publish step yet, so saving must keep a course visible to learners.
    const savedCourse = editingCourse?.id
      ? await updateCourse({
          ...course,
          id: editingCourse.id,
          status: editingCourse.status ?? "published",
        })
      : await createCourse({ ...course, status: "published" });

    courses = editingCourse?.id
      ? courses.map((item) => (item.id === savedCourse.id ? savedCourse : item))
      : [...courses, savedCourse];
    setSelectedCourse(savedCourse);
    setEditingCourse(undefined);
    refreshCourses((version) => version + 1);
    setPage("admin");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const deleteCourse = async (course: Course) => {
    if (!window.confirm(`Delete "${course.title}"? This cannot be undone.`))
      return;
    try {
      await removeCourse(course);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "The course could not be deleted.",
      );
      return;
    }
    courses = courses.filter((item) => item.id !== course.id);
    if (selectedCourse.id === course.id && courses.length > 0)
      setSelectedCourse(courses[0]);
    refreshCourses((version) => version + 1);
    setPage("admin");
  };
  navigate = (nextPage, course, lessonIndex) => {
    if (course) setSelectedCourse(course);
    setEditingCourse(nextPage === "builder" ? course : undefined);
    setSelectedLessonIndex(Math.max(0, lessonIndex ?? 0));
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  void courseVersion;
  if (courseLoadState === "loading") {
    return (
      <main className="auth">
        <section>
          <Logo />
          <div>
            <span className="eyebrow light">ELITE RC LEARNING HUB</span>
            <h1>Loading shared courses.</h1>
            <p>Connecting to the course library...</p>
          </div>
        </section>
      </main>
    );
  }
  if (courseLoadState === "error") {
    return (
      <main className="auth">
        <section>
          <Logo />
          <div>
            <span className="eyebrow light">COURSE LIBRARY UNAVAILABLE</span>
            <h1>We could not load shared courses.</h1>
            <p>{courseLoadError}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </section>
      </main>
    );
  }
  // Staff pages stay open with an empty library so the first course can be added.
  if (
    courses.length === 0 &&
    ![...STAFF_PAGES, "auth", "reset-password"].includes(page)
  ) {
    return (
      <main className="auth">
        <section>
          <Logo />
          <div>
            <span className="eyebrow light">COURSE LIBRARY</span>
            <h1>No published courses yet.</h1>
            <p>Staff can add the first course from the staff workspace.</p>
            {isStaff(user) ? (
              <Button onClick={() => setPage("admin")}>Open staff workspace</Button>
            ) : (
              <Button onClick={() => setPage("auth")}>Staff sign in</Button>
            )}
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
        </section>
      </main>
    );
  }
  // Hiding staff pages here is for clarity; the backend refuses changes from non-staff.
  if (STAFF_PAGES.includes(page) && !user) return <Auth />;
  if (STAFF_PAGES.includes(page) && !isStaff(user)) {
    return (
      <main className="auth">
        <section>
          <Logo />
          <div>
            <span className="eyebrow light">STAFF ONLY</span>
            <h1>This area is for staff.</h1>
            <p>
              You are signed in as {user?.email}, which is a member account. Ask
              an administrator if you need staff access.
            </p>
            <Button onClick={() => setPage("home")}>Back to home</Button>
          </div>
        </section>
      </main>
    );
  }
  const staffAccount = user && {
    name: memberName(user),
    initials: memberInitials(user),
    onViewSite: () => go("home"),
    onSignOut: () => void signOut(),
  };
  const content = page === "home" ? (
    <Home user={user} onSignOut={signOut} />
  ) : page === "about" ? (
    <About user={user} onSignOut={signOut} />
  ) : page === "explore" ? (
    <Explore user={user} onSignOut={signOut} />
  ) : page === "course" ? (
    <CourseDetails course={selectedCourse} user={user} onSignOut={signOut} />
  ) : page === "dashboard" ? (
    user ? (
      <Dashboard user={user} onSignOut={signOut} />
    ) : (
      <Auth />
    )
  ) : page === "lesson" ? (
    <Lesson course={selectedCourse} lessonIndex={selectedLessonIndex} />
  ) : page === "progress" ? (
    user ? (
      <ProgressPage user={user} onSignOut={signOut} />
    ) : (
      <Auth />
    )
  ) : page === "admin" ? (
    <StaffOverview
      courses={courses}
      onNavigate={(nextPage, course) => go(nextPage, course)}
      onSaveCourse={saveCourse}
      onDeleteCourse={deleteCourse}
    />
  ) : page === "builder" ? (
    <CourseBuilderPage
      key={editingCourse?.id ?? "new-course"}
      courses={courses}
      onNavigate={(nextPage, course) => go(nextPage, course)}
      onSaveCourse={saveCourse}
      onDeleteCourse={deleteCourse}
      editingCourse={editingCourse}
    />
  ) : page === "preview" ? (
    <StaffCoursePreview
      course={selectedCourse}
      onNavigate={(nextPage, course) => go(nextPage, course)}
    />
  ) : page === "instructor" ? (
    <InstructorWorkspace
      courses={courses}
      onNavigate={(nextPage, course) => go(nextPage, course)}
      onSaveCourse={saveCourse}
      onDeleteCourse={deleteCourse}
    />
  ) : page === "auth" ? (
    <Auth />
  ) : page === "reset-password" ? (
    <ResetPassword />
  ) : user ? (
    <ProfilePage user={user} onSignOut={signOut} />
  ) : (
    <Auth />
  );
  return (
    <StaffAccountContext.Provider value={staffAccount}>
      {content}
    </StaffAccountContext.Provider>
  );
}
