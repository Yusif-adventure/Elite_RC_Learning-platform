import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { HeroSky, NightSky, useScrollReveal } from "./HomeMotion";
import { courseImageProps, personImageProps } from "./imageFallback";
import type { User } from "@supabase/supabase-js";
import { PrivacyPolicyContent, TermsOfServiceContent } from "./LegalPages";
import {
  InstructorWorkspace,
  MembersPage,
  StaffAccountContext,
  StaffOverview,
} from "./features/staff/StaffPages";
import { CourseBuilderPage } from "./features/staff/CourseBuilderPage";
import type { CourseResource, StaffCourse } from "./features/staff/StaffPages";
import {
  API_URL,
  createCourse,
  removeCourse,
  setMemberRole,
  updateCourse,
} from "./features/staff/courseApi";
import { ConfirmDialog, errorText, useToast } from "./features/staff/Feedback";
import { useStaffData } from "./features/staff/useStaffData";
import { withoutAssessments } from "./features/staff/quizDrafts";
import type { Member, Role } from "./staffStats";
import { supabase } from "./supabaseClient";
import {
  parsePath,
  parseRoute,
  routePath,
  waitsForCourses,
  type Page,
  type Route,
} from "./routes";
import { CATEGORIES, catalogCategories } from "./categories";
import {
  courseProgress,
  coursesInProgress,
  lessonKey,
  type ProgressRow,
} from "./progress";
import {
  loadProgress,
  markLessonComplete,
  markLessonNotDone,
  type ProgressState,
} from "./progressApi";

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
      aria-label="Elite RC Community home"
    >
      <img className="brand-logo" src="/logo.png" alt="Elite RC Community" />
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
  return ["staff", "instructor"].includes(user?.app_metadata?.role);
}

function roleLabel(user?: User | null) {
  const role = user?.app_metadata?.role;
  return role === "instructor" ? "Instructor" : role === "staff" ? "Staff" : "Member";
}

const STAFF_PAGES: Page[] = ["admin", "builder", "instructor", "members"];

function memberInitials(user: User) {
  return initialsOf(memberName(user));
}

function initialsOf(name: string) {
  return name
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

// Set by App: changes the address and shows that page.
let navigateTo: (route: Route, options?: { replace?: boolean }) => void = () => {};

function routeFor(page: Page, course?: Course, lessonIndex = 0): Route {
  switch (page) {
    case "course":
      return course?.id ? { page, courseId: course.id } : { page: "explore" };
    case "lesson":
      return course?.id
        ? { page, courseId: course.id, lessonIndex: Math.max(0, lessonIndex) }
        : { page: "explore" };
    case "builder":
      return course?.id ? { page, courseId: course.id } : { page };
    default:
      return { page } as Route;
  }
}

function go(page: Page, course?: Course, lessonIndex?: number) {
  navigateTo(routeFor(page, course, lessonIndex));
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
  loading = false,
}: {
  user?: User | null;
  onSignOut?: () => void;
  // True while the course library is still on its way. The page shows straight
  // away so its animations start, and the course parts fill in when it arrives.
  loading?: boolean;
}) {
  // Nothing is counted until the real library arrives.
  const library = loading ? [] : courses;
  const coursesIn = (category: string) =>
    library.filter((course) => course.category === category).length;
  const lessonTotal = library.reduce((total, course) => total + lessonCount(course), 0);
  const instructors = [...new Set(library.map((course) => course.instructor))];
  const mainRef = useRef<HTMLElement>(null);
  // Look again once the courses arrive, so the new course cards slide in too.
  useScrollReveal(mainRef, loading);
  return (
    <>
      <PublicHeader active="home" user={user} onSignOut={onSignOut} />
      <main className="public-main" ref={mainRef}>
        <section className="hero">
          <HeroSky />
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
              {!user && (
                <Button
                  variant="outline"
                  onClick={() => navigateTo({ page: "auth", register: true })}
                >
                  Join the Community
                </Button>
              )}
            </div>
            {/* Holds its space while loading so the headline does not jump. */}
            <div
              className="hero-proof"
              data-loading={loading ? "" : undefined}
              aria-hidden={loading || undefined}
            >
              <span className="avatar-stack">
                {instructors.slice(0, 3).map((name) => (
                  <i key={name} title={name}>
                    {initialsOf(name)}
                  </i>
                ))}
              </span>
              <p>
                <b>
                  {library.length} {library.length === 1 ? "course" : "courses"} ·{" "}
                  {lessonTotal} {lessonTotal === 1 ? "lesson" : "lessons"}
                </b>
                <br />
                taught by {instructors.length}{" "}
                {instructors.length === 1 ? "instructor" : "instructors"}
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
          <div className="section-head" data-reveal>
            <div>
              <span className="eyebrow">START YOUR JOURNEY</span>
              <h2>Featured courses</h2>
            </div>
            <button className="text-link" onClick={() => go("explore")}>
              View all courses <Icon name="arrow" size={16} />
            </button>
          </div>
          {loading ? (
            <p className="panel-note">Loading courses...</p>
          ) : (
            <div className="course-grid" data-reveal-group>
              {getFeaturedCourses().map((c, i) => (
                <CourseCard course={c} index={i} key={c.title} />
              ))}
            </div>
          )}
        </section>
        <section className="category-section">
          <NightSky />
          <div className="section-head" data-reveal>
            <div>
              <span className="eyebrow light">EXPLORE THE WORKSHOP</span>
              <h2>What will you build next?</h2>
            </div>
          </div>
          <div className="category-grid" data-reveal-group="left">
            {CATEGORIES.map(({ icon, name, blurb }) => {
              const count = coursesIn(name);
              return (
                <button
                  key={name}
                  disabled={!loading && count === 0}
                  onClick={() => navigateTo({ page: "explore", category: name })}
                >
                  <i>
                    <Icon name={icon} />
                  </i>
                  <span>
                    <b>{name}</b>
                    <small>
                      {loading
                        ? blurb
                        : count === 0
                          ? "Coming soon"
                          : `${blurb} · ${count} ${count === 1 ? "course" : "courses"}`}
                    </small>
                  </span>
                  {count > 0 && <Icon name="arrow" size={16} />}
                </button>
              );
            })}
          </div>
        </section>
        <section className="why">
          <div data-reveal="left">
            <span className="eyebrow">WHY ELITE RC</span>
            <h2>Engineering made tangible.</h2>
            <p>
              We turn complex systems into guided, hands-on learning that builds
              confidence from the first lesson.
            </p>
          </div>
          <div className="why-grid" data-reveal-group="zoom">
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

// The community group linked from the Privacy Policy's contact section.
const COMMUNITY_URL = "https://chat.whatsapp.com/CJUqUROgIGX0t2O4FJjhSG?s=cl&p=a&iam=2";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Logo />
          <p>Building Africa's next generation of practical engineers.</p>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          <div className="footer-group">
            <h2>Learn</h2>
            <button type="button" onClick={() => go("explore")}>Browse courses</button>
            <button type="button" onClick={() => go("dashboard")}>Student space</button>
          </div>
          <div className="footer-group">
            <h2>Community</h2>
            <button type="button" onClick={() => go("about")}>About us</button>
            <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">
              WhatsApp group <span aria-hidden="true">↗</span>
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </div>
          <div className="footer-group">
            <h2>Legal</h2>
            <button type="button" onClick={() => go("privacy")}>Privacy Policy</button>
            <button type="button" onClick={() => go("terms")}>Terms of Service</button>
          </div>
        </nav>
      </div>
      <div className="footer-bottom">
        <small>© {new Date().getFullYear()} ELITE RC Community. All rights reserved.</small>
        <small>Learn boldly.</small>
      </div>
    </footer>
  );
}

function Explore({
  filters,
  user,
  onSignOut,
}: {
  filters: Extract<Route, { page: "explore" }>;
  user?: User | null;
  onSignOut?: () => void;
}) {
  const [search, setSearch] = useState(filters.search ?? "");
  const [filter, setFilter] = useState(filters.category ?? "All");
  const [difficulty, setDifficulty] = useState(filters.level ?? "All levels");
  // Keep the address in step with the filters so a filtered catalog can be shared.
  useEffect(() => {
    const path = routePath({
      page: "explore",
      category: filter === "All" ? undefined : filter,
      level: difficulty === "All levels" ? undefined : difficulty,
      search,
    });
    window.history.replaceState(null, "", path);
  }, [search, filter, difficulty]);
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
            {["All", ...catalogCategories(courses.map((c) => c.category))].map(
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
          <b>
            {filtered.length} {filtered.length === 1 ? "course" : "courses"}
          </b>
          <span>
            {filter === "All" ? "Showing practical learning paths" : `in ${filter}`}
          </span>
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

function PrivacyPolicyPage({ user, onSignOut }: { user?: User | null; onSignOut?: () => void }) {
  return (
    <>
      <PublicHeader user={user} onSignOut={onSignOut} />
      <PrivacyPolicyContent onNavigate={go} />
      <Footer />
    </>
  );
}

function TermsOfServicePage({ user, onSignOut }: { user?: User | null; onSignOut?: () => void }) {
  return (
    <>
      <PublicHeader user={user} onSignOut={onSignOut} />
      <TermsOfServiceContent onNavigate={go} />
      <Footer />
    </>
  );
}

function CourseDetails({
  course,
  user,
  onSignOut,
  tracking,
}: {
  course: Course;
  user?: User | null;
  onSignOut?: () => void;
  tracking?: ProgressRow[];
}) {
  const [open, setOpen] = useState(0);
  const progress = tracking ? courseProgress(course, tracking) : undefined;
  const doneKeys = new Set(
    (tracking ?? []).filter((row) => row.course_id === course.id).map((row) => row.lesson_key),
  );
  const total = lessonCount(course);
  const startButton = (
    <Button
      disabled={total === 0}
      onClick={() => go("lesson", course, progress?.nextIndex ?? 0)}
    >
      {total === 0
        ? "Lessons coming soon"
        : progress?.finished
          ? "Review course"
          : progress?.done
            ? "Continue learning"
            : "Start Learning"}{" "}
      {total > 0 && <Icon name="arrow" />}
    </Button>
  );
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
            {progress && progress.done > 0 && (
              <div className="course-progress">
                <div className="progress-bar">
                  <i style={{ width: `${progress.percent}%` }} />
                </div>
                <small>
                  {progress.done} of {progress.total} lessons complete
                </small>
              </div>
            )}
            {startButton}
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
                            <Icon
                              name={doneKeys.has(lessonKey(lesson)) ? "check" : "play"}
                              size={17}
                            />
                            <span>
                              {lesson.title}
                              <small>
                                {doneKeys.has(lessonKey(lesson)) ? "COMPLETED" : "OPEN LESSON"}
                              </small>
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
            {startButton}
          </aside>
        </section>
      </main>
    </>
  );
}

const studentNav: [Page, IconName, string][] = [
  ["dashboard", "grid", "Dashboard"],
  ["explore", "search", "Explore Courses"],
  ["progress", "book", "My Learning"],
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
            <small>{roleLabel(user)}</small>
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

function Dashboard({
  user,
  onSignOut,
  progress,
}: {
  user: User;
  onSignOut: () => void;
  progress: ProgressState;
}) {
  const tracking = progress.status === "ready" ? progress.rows : undefined;
  const started = tracking ? coursesInProgress(courses, tracking) : [];
  const current = started.find((entry) => !entry.progress.finished) ?? started[0];
  const lessonsDone = started.reduce((total, entry) => total + entry.progress.done, 0);
  const finishedCount = started.filter((entry) => entry.progress.finished).length;
  const featured = courses[0];
  const nextTitle =
    current && current.progress.nextIndex !== undefined
      ? current.course.lessonContent?.[current.progress.nextIndex]?.title
      : undefined;

  return (
    <AppShell active="dashboard" user={user} onSignOut={onSignOut}>
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR LEARNING</span>
          <h1>Welcome back, {memberName(user)}.</h1>
          <p>
            {current
              ? "Pick up where you left off."
              : "You're building real engineering skills, one lesson at a time."}
          </p>
        </div>
      </div>
      {current ? (
        <section className="continue-card">
          <img {...courseImageProps(current.course.image)} alt="" />
          <div>
            <span className="badge">
              {current.progress.finished ? "COMPLETED" : "IN PROGRESS"}
            </span>
            <h2>{current.course.title}</h2>
            <p>
              {nextTitle ? (
                <>
                  Next up: <b>{nextTitle}</b>
                </>
              ) : (
                "You have completed every lesson in this course."
              )}
            </p>
            <div className="progress-bar">
              <i style={{ width: `${current.progress.percent}%` }} />
            </div>
            <small>
              <span>
                {current.progress.done} of {current.progress.total} lessons complete
              </span>
              <span>{current.progress.percent}%</span>
            </small>
            <Button
              onClick={() =>
                go("lesson", current.course, current.progress.nextIndex ?? 0)
              }
            >
              {current.progress.finished ? "Review course" : "Continue learning"}{" "}
              <Icon name="arrow" />
            </Button>
          </div>
        </section>
      ) : progress.status === "loading" ? (
        <section className="continue-card loading" aria-busy="true">
          <div>
            <span className="badge">YOUR LEARNING</span>
            <h2>Loading your progress...</h2>
          </div>
        </section>
      ) : featured ? (
        <section className="continue-card">
          <img {...courseImageProps(featured.image)} alt="" />
          <div>
            <span className="badge">START HERE</span>
            <h2>{featured.title}</h2>
            <p>{featured.desc}</p>
            <small>
              {lessonCount(featured)} lessons · {featured.duration}
            </small>
            <Button onClick={() => go("course", featured)}>
              View course <Icon name="arrow" />
            </Button>
          </div>
        </section>
      ) : null}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{tracking ? "Your progress" : "Learning rhythm"}</h2>
            <p>
              {tracking
                ? "Lessons count once you mark them complete."
                : "A simple way to keep your workshop practice moving."}
            </p>
          </div>
          {tracking && (
            <Button variant="outline" onClick={() => go("progress")}>
              My learning
            </Button>
          )}
        </div>
        <div className="dashboard-overview">
          {tracking ? (
            <>
              <article>
                <span className="eyebrow">LESSONS COMPLETED</span>
                <h3>{lessonsDone}</h3>
                <p>
                  Across {started.length} {started.length === 1 ? "course" : "courses"}.
                </p>
              </article>
              <article>
                <span className="eyebrow">COURSES FINISHED</span>
                <h3>{finishedCount}</h3>
                <p>Complete every lesson in a course to finish it.</p>
              </article>
            </>
          ) : (
            <>
              <article>
                <span className="eyebrow">EXPLORE</span>
                <h3>
                  {courses.length} {courses.length === 1 ? "course" : "courses"} to choose from
                </h3>
                <p>Browse the catalog and pick the next idea you want to turn into something you can build.</p>
              </article>
              <article>
                <span className="eyebrow">WORKSHOP NOTE</span>
                <h3>Small sessions add up.</h3>
                <p>Set aside a little time to review, practice, and return to your project with a clearer eye.</p>
              </article>
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
}

type LessonTracking = {
  done: boolean;
  onComplete: () => Promise<void>;
  onUndo: () => Promise<void>;
};

function Lesson({
  course,
  lessonIndex,
  tracking,
  signedIn,
}: LessonSelection & { tracking?: LessonTracking; signedIn: boolean }) {
  const [started, setStarted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const lesson = course.lessonContent?.[lessonIndex];
  const total = lessonCount(course);
  const title = lesson?.title || course.sampleLessons[lessonIndex] || "Lesson";
  const previousIndex = lessonIndex > 0 ? lessonIndex - 1 : undefined;
  const nextIndex = lessonIndex + 1 < total ? lessonIndex + 1 : undefined;
  const nextTitle =
    nextIndex === undefined ? undefined : course.lessonContent?.[nextIndex]?.title;
  const slideCount = lesson?.slides.length ?? 0;
  const included: [IconName, string][] = [];
  if (slideCount) {
    included.push(["file", `${slideCount} slide ${slideCount === 1 ? "file" : "files"} to open or download`]);
  }
  if (lesson?.video) included.push(["video", "A short video preview"]);
  if (lesson?.youtubeUrl) included.push(["play", "The full lesson video on YouTube"]);

  const completesLesson = Boolean(tracking && !tracking.done);
  // Saves the lesson as complete (when tracking) before moving on.
  const moveOn = async () => {
    if (completesLesson && tracking) {
      setSaving(true);
      setSaveError("");
      try {
        await tracking.onComplete();
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Your progress could not be saved.");
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    if (nextIndex === undefined) go("course", course);
    else go("lesson", course, nextIndex);
  };
  const undo = async () => {
    if (!tracking) return;
    setSaving(true);
    setSaveError("");
    try {
      await tracking.onUndo();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Your progress could not be saved.");
    }
    setSaving(false);
  };

  return (
    <div className="lesson-shell">
      <header className="lesson-top">
        <Logo dark />
        <button className="crumb" onClick={() => go("course", course)}>
          ← {course.title}
        </button>
        <span>
          Lesson {lessonIndex + 1} of {total}
        </span>
      </header>
      <main className="lesson-content">
        <span className="eyebrow">
          {(lesson?.section || course.category).toUpperCase()} · LESSON{" "}
          {lessonIndex + 1}
        </span>
        <h1>{title}</h1>
        <p className="lead">
          {started
            ? "Work through the resources below at your own pace."
            : `Part of ${course.title}${lesson?.section ? `, in the ${lesson.section} section` : ""}.`}
        </p>
        {tracking?.done && (
          <p className="lesson-done" role="status">
            <Icon name="check" size={16} /> You completed this lesson.
            <button type="button" onClick={() => void undo()} disabled={saving}>
              Mark as not done
            </button>
          </p>
        )}
        <article className="content-card">
          {started ? (
            <>
              <h2>Lesson resources</h2>
              {slideCount ? (
                <div className="lesson-resource">
                  <b>Slides</b>
                  {lesson?.slides.map((slide) => {
                    const resource = asResource(slide);
                    return (
                      <a
                        href={resource.url}
                        download={resource.name}
                        target="_blank"
                        rel="noreferrer"
                        key={resource.url}
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
                </div>
              ) : null}
              {lesson?.youtubeUrl ? (
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
              {included.length === 0 && (
                <p>The instructor has not added files or videos to this lesson yet.</p>
              )}
            </>
          ) : (
            <>
              <h2>In this lesson</h2>
              {included.length ? (
                <div className="objectives">
                  {included.map(([icon, text]) => (
                    <p key={text}>
                      <i>
                        <Icon name={icon} size={15} />
                      </i>
                      {text}
                    </p>
                  ))}
                </div>
              ) : (
                <p>The instructor has not added files or videos to this lesson yet.</p>
              )}
              {course.objectives.length > 0 && (
                <>
                  <h3 className="lesson-subhead">This course helps you</h3>
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
            </>
          )}
        </article>
        <nav className="lesson-nav" aria-label="Lessons">
          {previousIndex === undefined ? (
            <Button variant="outline" onClick={() => go("course", course)}>
              Back to course
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => go("lesson", course, previousIndex)}
            >
              ← Previous lesson
            </Button>
          )}
          {!started ? (
            <Button onClick={() => setStarted(true)}>
              Start lesson <Icon name="arrow" />
            </Button>
          ) : (
            <Button onClick={() => void moveOn()} disabled={saving}>
              {saving
                ? "Saving..."
                : nextIndex === undefined
                  ? completesLesson
                    ? "Complete course"
                    : "Finish course"
                  : completesLesson
                    ? "Complete & continue"
                    : "Next lesson"}{" "}
              <Icon name={nextIndex === undefined ? "check" : "arrow"} />
            </Button>
          )}
        </nav>
        {saveError && (
          <p role="alert" className="form-error lesson-next">
            {saveError}
          </p>
        )}
        {started && nextTitle && <p className="lesson-next">Up next: {nextTitle}</p>}
        {started && !signedIn && (
          <p className="lesson-next">
            <button
              type="button"
              className="text-link"
              onClick={() =>
                navigateTo({
                  page: "auth",
                  next: routePath({ page: "lesson", courseId: course.id ?? "", lessonIndex }),
                })
              }
            >
              Sign in to keep track of the lessons you complete
            </button>
          </p>
        )}
      </main>
    </div>
  );
}

function ProgressPage({
  user,
  onSignOut,
  progress,
}: {
  user: User;
  onSignOut: () => void;
  progress: ProgressState;
}) {
  const tracking = progress.status === "ready" ? progress.rows : undefined;
  const started = tracking ? coursesInProgress(courses, tracking) : [];
  const notStarted = courses.filter(
    (course) => !started.some((entry) => entry.course.id === course.id),
  );

  return (
    <AppShell active="progress" user={user} onSignOut={onSignOut}>
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR LEARNING</span>
          <h1>My learning</h1>
          <p>Every course you have started, and how far you are.</p>
        </div>
      </div>
      {progress.status === "loading" && (
        <section className="panel">
          <p className="panel-note">Loading your progress...</p>
        </section>
      )}
      {progress.status === "unavailable" && (
        <section className="panel">
          <p className="panel-note">
            Progress tracking is not switched on yet, so completed lessons are
            not saved. You can still open every course and lesson.
          </p>
        </section>
      )}
      {tracking && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>In progress</h2>
              <p>
                {started.length
                  ? "Pick up where you left off."
                  : "You have not completed any lessons yet. Mark lessons complete as you go."}
              </p>
            </div>
          </div>
          {started.map(({ course, progress: courseState }) => (
            <div className="skill-row" key={course.id}>
              <img {...courseImageProps(course.image)} alt="" />
              <div>
                <b>{course.title}</b>
                <span>
                  {courseState.done} of {courseState.total} lessons ·{" "}
                  {courseState.percent}%
                </span>
                <div className="progress-bar">
                  <i style={{ width: `${courseState.percent}%` }} />
                </div>
              </div>
              <Button
                variant={courseState.finished ? "outline" : "primary"}
                onClick={() => go("lesson", course, courseState.nextIndex ?? 0)}
              >
                {courseState.finished ? "Review" : "Continue"}
              </Button>
            </div>
          ))}
        </section>
      )}
      {notStarted.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{tracking ? "Not started yet" : "Courses"}</h2>
              <p>Open a course to start learning.</p>
            </div>
          </div>
          {notStarted.map((course) => (
            <div className="skill-row" key={course.id ?? course.title}>
              <img {...courseImageProps(course.image)} alt="" />
              <div>
                <b>{course.title}</b>
                <span>
                  {lessonCount(course)} {lessonCount(course) === 1 ? "lesson" : "lessons"} ·{" "}
                  {course.level}
                </span>
              </div>
              <Button variant="outline" onClick={() => go("course", course)}>
                View course
              </Button>
            </div>
          ))}
        </section>
      )}
    </AppShell>
  );
}

// returnTo is the page that needed a sign-in; it opens again afterwards.
function Auth({ returnTo, startRegistering = false }: { returnTo?: Route; startRegistering?: boolean }) {
  const [register, setRegister] = useState(startRegistering);
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
        // Replace the sign-in page so Back does not return to it.
        navigateTo(
          returnTo ?? { page: isStaff(result.data.session.user) ? "admin" : "dashboard" },
          { replace: true },
        );
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
          {register && !forgotPassword && (
            <p className="auth-legal-note">
              By creating an account, you agree to our{" "}
              <button type="button" onClick={() => go("terms")}>
                Terms of Service
              </button>{" "}
              and{" "}
              <button type="button" onClick={() => go("privacy")}>
                Privacy Policy
              </button>
              .
            </p>
          )}
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
  const [fullName, setFullName] = useState(memberName(user));
  const [nameState, setNameState] = useState({ busy: false, error: "", done: "" });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordState, setPasswordState] = useState({ busy: false, error: "", done: "" });

  const saveName = async () => {
    const name = fullName.trim();
    if (!name) {
      setNameState({ busy: false, error: "Enter your name.", done: "" });
      return;
    }
    setNameState({ busy: true, error: "", done: "" });
    // The new name reaches the rest of the app through Supabase's USER_UPDATED event.
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    setNameState(
      error
        ? { busy: false, error: error.message, done: "" }
        : { busy: false, error: "", done: "Your name has been saved." },
    );
  };

  const savePassword = async () => {
    if (password.length < 6) {
      setPasswordState({ busy: false, error: "Use at least 6 characters.", done: "" });
      return;
    }
    if (password !== confirmation) {
      setPasswordState({ busy: false, error: "The passwords do not match.", done: "" });
      return;
    }
    setPasswordState({ busy: true, error: "", done: "" });
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setPasswordState({ busy: false, error: error.message, done: "" });
      return;
    }
    setPassword("");
    setConfirmation("");
    setPasswordState({ busy: false, error: "", done: "Your password has been changed." });
  };

  return (
    <AppShell active="profile" user={user} onSignOut={onSignOut}>
      <div className="page-title">
        <div>
          <span className="eyebrow">ACCOUNT</span>
          <h1>Your profile</h1>
          <p>Update your name and password.</p>
        </div>
      </div>
      <section className="panel profile-panel">
        <div className="profile-cover" />
        <div className="profile-main">
          <span className="profile-avatar">{memberInitials(user)}</span>
          <div>
            <h2>{memberName(user)}</h2>
            <p>
              {roleLabel(user)} · {user.email}
            </p>
          </div>
          <Button variant="outline" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
        <form
          className="profile-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveName();
          }}
        >
          <h3>Your name</h3>
          <label>
            Full name
            <input
              value={fullName}
              autoComplete="name"
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>
          <label>
            Email address
            <input value={user.email || ""} readOnly aria-describedby="email-note" />
            <small id="email-note">Your email address is your sign-in and cannot be changed here.</small>
          </label>
          <div className="profile-actions">
            <Button disabled={nameState.busy || fullName.trim() === memberName(user)}>
              {nameState.busy ? "Saving..." : "Save name"}
            </Button>
            {nameState.error && <p role="alert" className="form-error">{nameState.error}</p>}
            {nameState.done && <p role="status">{nameState.done}</p>}
          </div>
        </form>
        <form
          className="profile-form"
          onSubmit={(event) => {
            event.preventDefault();
            void savePassword();
          }}
        >
          <h3>Change password</h3>
          <label>
            New password
            <input
              type="password"
              value={password}
              autoComplete="new-password"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={confirmation}
              autoComplete="new-password"
              minLength={6}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          <div className="profile-actions">
            <Button disabled={passwordState.busy || !password}>
              {passwordState.busy ? "Saving..." : "Change password"}
            </Button>
            {passwordState.error && <p role="alert" className="form-error">{passwordState.error}</p>}
            {passwordState.done && <p role="status">{passwordState.done}</p>}
          </div>
        </form>
      </section>
    </AppShell>
  );
}

function NotFound({
  user,
  onSignOut,
  title = "Page not found",
  message = "The link may be incomplete, or the page has moved.",
}: {
  user?: User | null;
  onSignOut?: () => void;
  title?: string;
  message?: string;
}) {
  return (
    <>
      <PublicHeader user={user} onSignOut={onSignOut} />
      <main className="catalog">
        <div className="empty">
          <Icon name="search" size={32} />
          <h2>{title}</h2>
          <p>{message}</p>
          <Button onClick={() => go("explore")}>Browse courses</Button>
        </div>
      </main>
      <Footer />
    </>
  );
}

function StatusScreen({
  eyebrow,
  title,
  message,
  children,
}: {
  eyebrow: string;
  title: string;
  message: string;
  children?: ReactNode;
}) {
  return (
    <main className="auth">
      <section>
        <Logo />
        <div>
          <span className="eyebrow light">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{message}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

const SIGNED_IN_PAGES: Page[] = [
  "dashboard",
  "progress",
  "profile",
  "lesson",
  ...STAFF_PAGES,
];

function lessonCount(course: Course) {
  return course.lessonContent?.length ?? course.lessons;
}

function pageTitle(route: Route, course?: Course) {
  const titles: Partial<Record<Page, string>> = {
    explore: "Courses",
    about: "About",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    auth: "Sign in",
    "reset-password": "Reset password",
    dashboard: "Dashboard",
    progress: "My learning",
    profile: "Profile",
    admin: "Staff workspace",
    instructor: "Instructor workspace",
    members: "Members",
    builder: course ? `Edit ${course.title}` : "New course",
    "not-found": "Page not found",
  };
  if (route.page === "lesson" && course) {
    const lesson = course.lessonContent?.[route.lessonIndex];
    return `${lesson?.title ?? "Lesson"} · ${course.title}`;
  }
  const title = route.page === "course" ? course?.title : titles[route.page];
  return title ? `${title} · Elite RC` : "Elite RC Learning Hub";
}

export default function App() {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(window.location.pathname, window.location.search),
  );
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [courseVersion, refreshCourses] = useState(0);
  const [courseLoadState, setCourseLoadState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [courseLoadError, setCourseLoadError] = useState("");
  const [progress, setProgress] = useState<ProgressState>({ status: "off", rows: [] });
  const page = route.page;
  const notify = useToast();
  // Drafts, members, and everyone's progress, loaded only for staff pages.
  const staffData = useStaffData(isStaff(user) && STAFF_PAGES.includes(page));
  const [pendingDelete, setPendingDelete] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

  navigateTo = (next, { replace = false } = {}) => {
    const path = routePath(next);
    if (replace) window.history.replaceState(null, "", path);
    else if (path !== window.location.pathname + window.location.search) {
      window.history.pushState(null, "", path);
    }
    setRoute(next);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const showAddress = () =>
      setRoute(parseRoute(window.location.pathname, window.location.search));
    window.addEventListener("popstate", showAddress);
    return () => window.removeEventListener("popstate", showAddress);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") {
        navigateTo({ page: "reset-password" }, { replace: true });
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setProgress({ status: "off", rows: [] });
      return;
    }
    let active = true;
    setProgress({ status: "loading", rows: [] });
    loadProgress().then((loaded) => {
      if (active) setProgress(loaded);
    });
    return () => {
      active = false;
    };
  }, [userId]);
  const tracking = progress.status === "ready" ? progress.rows : undefined;

  const lessonTracking = (course: Course, index: number) => {
    const lesson = course.lessonContent?.[index];
    const courseId = course.id;
    if (!tracking || !user || !lesson || !courseId) return undefined;
    const key = lessonKey(lesson);
    const isSaved = (row: ProgressRow) =>
      row.course_id === courseId && row.lesson_key === key;
    return {
      done: tracking.some(isSaved),
      onComplete: async () => {
        await markLessonComplete(user.id, courseId, key);
        setProgress((current) =>
          current.status !== "ready" || current.rows.some(isSaved)
            ? current
            : {
                ...current,
                rows: [
                  ...current.rows,
                  { course_id: courseId, lesson_key: key, completed_at: new Date().toISOString() },
                ],
              },
        );
      },
      onUndo: async () => {
        await markLessonNotDone(user.id, courseId, key);
        setProgress((current) =>
          current.status === "ready"
            ? { ...current, rows: current.rows.filter((row) => !isSaved(row)) }
            : current,
        );
      },
    };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigateTo({ page: "home" });
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

  void courseVersion;
  // The builder can edit drafts, which only the staff course list includes.
  const routeCourse =
    "courseId" in route && route.courseId
      ? (page === "builder" ? staffData.courses : courses).find(
          (course) => course.id === route.courseId,
        )
      : undefined;

  useEffect(() => {
    document.title = pageTitle(route, routeCourse);
  });

  // Learners only see published courses, so a draft leaves the public list.
  const syncPublicCourse = (savedCourse: Course) => {
    // Learner pages never hold quiz answer keys, even in a staff browser.
    const saved = withoutAssessments(savedCourse);
    const others = courses.filter((item) => item.id !== saved.id);
    courses =
      saved.status === "published"
        ? courses.some((item) => item.id === saved.id)
          ? courses.map((item) => (item.id === saved.id ? saved : item))
          : [...others, saved]
        : others;
    refreshCourses((version) => version + 1);
  };

  const saveCourse = async (course: Course) => {
    const editingCourse = page === "builder" ? routeCourse : undefined;
    const status = course.status === "draft" ? "draft" : "published";
    const savedCourse = editingCourse?.id
      ? await updateCourse({ ...course, id: editingCourse.id, status })
      : await createCourse({ ...course, status });
    syncPublicCourse(savedCourse);
    staffData.reload();
    notify(
      status === "published"
        ? `"${savedCourse.title}" is published and visible to learners.`
        : `"${savedCourse.title}" is saved as a draft. Only staff can see it.`,
    );
    navigateTo({ page: "admin" });
  };

  const togglePublish = async (course: Course) => {
    const status = course.status === "published" ? "draft" : "published";
    try {
      const savedCourse = await updateCourse({ ...course, status });
      syncPublicCourse(savedCourse);
      staffData.setData((current) => ({
        ...current,
        courses: current.courses.map((item) =>
          item.id === savedCourse.id ? { ...item, ...savedCourse } : item,
        ),
      }));
      staffData.reload();
      notify(
        status === "published"
          ? `"${course.title}" is now live for learners.`
          : `"${course.title}" moved to drafts. Learners can no longer see it.`,
      );
    } catch (error) {
      notify(errorText(error, "The course could not be updated. Please try again."), "error");
    }
  };

  const deleteCourse = (course: Course) => setPendingDelete(course);

  const confirmDelete = async () => {
    const course = pendingDelete;
    if (!course) return;
    setDeleting(true);
    try {
      await removeCourse(course);
    } catch (error) {
      setDeleting(false);
      notify(errorText(error, "The course could not be deleted. Please try again."), "error");
      return;
    }
    courses = courses.filter((item) => item.id !== course.id);
    refreshCourses((version) => version + 1);
    staffData.setData((current) => ({
      ...current,
      courses: current.courses.filter((item) => item.id !== course.id),
      progress: current.progress.filter((row) => row.course_id !== course.id),
    }));
    setDeleting(false);
    setPendingDelete(null);
    notify(`"${course.title}" was deleted.`);
    if (page === "builder") navigateTo({ page: "admin" });
  };

  const changeRole = async (member: Member, role: Role) => {
    try {
      const updated = await setMemberRole(member.id, role);
      staffData.setData((current) => ({
        ...current,
        members: current.members.map((item) => (item.id === updated.id ? updated : item)),
      }));
      const label = { member: "a learner", instructor: "an instructor", staff: "staff" }[updated.role];
      notify(`${updated.name} is now ${label}.`);
    } catch (error) {
      notify(errorText(error, "The role could not be changed. Please try again."), "error");
      throw error;
    }
  };

  // The home page opens without waiting, so its animations are not held up.
  if (courseLoadState === "loading" && waitsForCourses(page)) {
    return (
      <StatusScreen
        eyebrow="ELITE RC LEARNING HUB"
        title="Loading shared courses."
        message="Connecting to the course library..."
      />
    );
  }
  if (courseLoadState === "error") {
    return (
      <StatusScreen
        eyebrow="COURSE LIBRARY UNAVAILABLE"
        title="We could not load shared courses."
        message={courseLoadError}
      >
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </StatusScreen>
    );
  }
  // Wait for the saved sign-in before deciding whether a page needs one.
  if (SIGNED_IN_PAGES.includes(page) && !authReady) {
    return (
      <StatusScreen
        eyebrow="ELITE RC LEARNING HUB"
        title="Checking your sign-in."
        message="One moment..."
      />
    );
  }
  // Staff pages stay open with an empty library so the first course can be added.
  if (
    courseLoadState === "ready" &&
    courses.length === 0 &&
    ![...STAFF_PAGES, "auth", "reset-password"].includes(page)
  ) {
    return (
      <StatusScreen
        eyebrow="COURSE LIBRARY"
        title="No published courses yet."
        message="Staff can add the first course from the staff workspace."
      >
        {isStaff(user) ? (
          <Button onClick={() => go("admin")}>Open staff workspace</Button>
        ) : (
          <Button onClick={() => go("auth")}>Staff sign in</Button>
        )}
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </StatusScreen>
    );
  }
  if (page === "lesson" && !user) return <Auth returnTo={route} />;
  // Hiding staff pages here is for clarity; the backend refuses changes from non-staff.
  if (STAFF_PAGES.includes(page) && !user) return <Auth returnTo={route} />;
  if (STAFF_PAGES.includes(page) && !isStaff(user)) {
    return (
      <StatusScreen
        eyebrow="STAFF ONLY"
        title="This area is for staff."
        message={`You are signed in as ${user?.email}, which is a member account. Ask an administrator if you need staff access.`}
      >
        <Button onClick={() => go("home")}>Back to home</Button>
      </StatusScreen>
    );
  }

  const courseNotFound = (
    <NotFound
      user={user}
      onSignOut={signOut}
      title="Course not found"
      message="This course may have been removed, or the link is incomplete."
    />
  );
  const staffAccount = user && {
    id: user.id,
    name: memberName(user),
    initials: memberInitials(user),
    role: user.app_metadata?.role === "instructor" ? ("instructor" as const) : ("staff" as const),
    onViewSite: () => go("home"),
    onSignOut: () => void signOut(),
  };
  const staffNavigate = (nextPage: Page, course?: Course) => go(nextPage, course);
  const dashboardProps = {
    courses: staffData.courses,
    members: staffData.members,
    progress: staffData.progress,
    status: staffData.status,
    error: staffData.error,
    notes: staffData.notes,
    onReload: staffData.reload,
    onNavigate: staffNavigate,
    onSaveCourse: saveCourse,
    onDeleteCourse: deleteCourse,
    onTogglePublish: togglePublish,
    onChangeRole: changeRole,
  };
  const staffLoading = staffData.status === "idle" || staffData.status === "loading";
  const deleteLearners = pendingDelete
    ? new Set(
        staffData.progress
          .filter((row) => row.course_id === pendingDelete.id)
          .map((row) => row.user_id),
      ).size
    : 0;

  let content: ReactNode;
  switch (route.page) {
    case "home":
      content = (
        <Home user={user} onSignOut={signOut} loading={courseLoadState === "loading"} />
      );
      break;
    case "about":
      content = <About user={user} onSignOut={signOut} />;
      break;
    case "privacy":
      content = <PrivacyPolicyPage user={user} onSignOut={signOut} />;
      break;
    case "terms":
      content = <TermsOfServicePage user={user} onSignOut={signOut} />;
      break;
    case "explore":
      content = (
        <Explore
          key={routePath(route)}
          filters={route}
          user={user}
          onSignOut={signOut}
        />
      );
      break;
    case "course":
      content = routeCourse ? (
        <CourseDetails
          course={routeCourse}
          user={user}
          onSignOut={signOut}
          tracking={tracking}
        />
      ) : (
        courseNotFound
      );
      break;
    case "lesson":
      content = !routeCourse ? (
        courseNotFound
      ) : route.lessonIndex < lessonCount(routeCourse) ? (
        <Lesson
          key={`${routeCourse.id}-${route.lessonIndex}`}
          course={routeCourse}
          lessonIndex={route.lessonIndex}
          tracking={lessonTracking(routeCourse, route.lessonIndex)}
          signedIn={Boolean(user)}
        />
      ) : (
        <NotFound
          user={user}
          onSignOut={signOut}
          title="Lesson not found"
          message={`${routeCourse.title} has ${lessonCount(routeCourse)} lessons.`}
        />
      );
      break;
    case "dashboard":
      content = user ? (
        <Dashboard user={user} onSignOut={signOut} progress={progress} />
      ) : (
        <Auth returnTo={route} />
      );
      break;
    case "progress":
      content = user ? (
        <ProgressPage user={user} onSignOut={signOut} progress={progress} />
      ) : (
        <Auth returnTo={route} />
      );
      break;
    case "profile":
      content = user ? (
        <ProfilePage user={user} onSignOut={signOut} />
      ) : (
        <Auth returnTo={route} />
      );
      break;
    case "auth":
      content = (
        <Auth
          key={`${route.register}-${route.next}`}
          startRegistering={route.register}
          returnTo={route.next ? parsePath(route.next) : undefined}
        />
      );
      break;
    case "reset-password":
      content = <ResetPassword />;
      break;
    case "admin":
      content = <StaffOverview {...dashboardProps} />;
      break;
    case "instructor":
      content = <InstructorWorkspace {...dashboardProps} />;
      break;
    case "members":
      content = <MembersPage {...dashboardProps} />;
      break;
    case "builder":
      if (route.courseId && staffLoading) {
        content = (
          <StatusScreen
            eyebrow="COURSE BUILDER"
            title="Opening the course."
            message="Loading the latest version..."
          />
        );
      } else if (route.courseId && staffData.status === "error") {
        content = (
          <StatusScreen
            eyebrow="COURSE BUILDER"
            title="We could not open this course."
            message={staffData.error}
          >
            <Button onClick={staffData.reload}>Try again</Button>
          </StatusScreen>
        );
      } else {
        content =
          route.courseId && !routeCourse ? (
            courseNotFound
          ) : (
            <CourseBuilderPage
              key={routeCourse?.id ?? "new-course"}
              courses={staffData.courses.length ? staffData.courses : courses}
              onNavigate={staffNavigate}
              onSaveCourse={saveCourse}
              onDeleteCourse={deleteCourse}
              editingCourse={routeCourse}
            />
          );
      }
      break;
    default:
      content = <NotFound user={user} onSignOut={signOut} />;
  }
  return (
    <StaffAccountContext.Provider value={staffAccount}>
      {content}
      {pendingDelete && (
        <ConfirmDialog
          title={`Delete "${pendingDelete.title}"?`}
          confirmLabel="Delete course"
          busyLabel="Deleting..."
          busy={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        >
          <p>
            This removes the course and its {lessonCount(pendingDelete)}{" "}
            {lessonCount(pendingDelete) === 1 ? "lesson" : "lessons"}
            {deleteLearners > 0 && (
              <>
                , along with the progress of <b>{deleteLearners} {deleteLearners === 1 ? "learner" : "learners"}</b>
              </>
            )}
            .
          </p>
          <p>
            <b>This cannot be undone.</b> To hide a course without losing anything, unpublish it instead.
          </p>
        </ConfirmDialog>
      )}
    </StaffAccountContext.Provider>
  );
}
