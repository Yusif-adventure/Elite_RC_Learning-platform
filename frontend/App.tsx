import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CourseBuilderPage,
  InstructorWorkspace,
  StaffCoursePreview,
  StaffOverview,
} from "./features/staff/StaffPages";
import type { CourseResource, StaffCourse } from "./features/staff/StaffPages";

type Page =
  | "home"
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
}: {
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost" | "danger";
  icon?: IconName;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button className={`btn ${variant} ${className}`} onClick={onClick}>
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
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function loadCourses(): Course[] {
  try {
    const stored = window.localStorage.getItem("elite-rc-courses");
    if (!stored) return initialCourses;
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as Course[]) : initialCourses;
  } catch {
    return initialCourses;
  }
}

let courses: Course[] = initialCourses;
courses = loadCourses();

function getFeaturedCourses() {
  const createdCourses = courses.filter(
    (course) => !initialCourses.some((initial) => initial.title === course.title),
  );
  return [...createdCourses, ...courses].filter(
    (course, index, list) =>
      list.findIndex((item) => item.title === course.title) === index,
  ).slice(0, 3);
}

function asResource(resource: CourseResource | string): CourseResource {
  return typeof resource === "string"
    ? { name: resource, url: resource }
    : resource;
}

function normalizeLink(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^https?\/\//i.test(trimmed)) return trimmed.replace(/^https?/i, "https:");
  return `https://${trimmed}`;
}

let navigate: (page: Page, course?: Course, lessonIndex?: number) => void = () => {};
function go(page: Page, course?: Course, lessonIndex?: number) {
  navigate(page, course, lessonIndex);
}

function PublicHeader({ active }: { active?: Page }) {
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
        <button onClick={() => go("home")}>About Us</button>
        <Button variant="outline" onClick={() => go("auth")}>
          Sign In
        </Button>
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
        <img src={course.image} alt={`${course.title} course cover`} />
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
            {course.lessons} lessons
          </span>
        </div>
        <Button variant={index === 0 ? "primary" : "outline"}>
          View Course <Icon name="arrow" size={16} />
        </Button>
      </div>
    </article>
  );
}

function Home() {
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
      <PublicHeader active="home" />
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
              src={hero}
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
        <button>Community</button>
        <button>About</button>
        <button>Contact</button>
      </div>
      <small>© 2025 ELITE RC Community. Learn boldly.</small>
    </footer>
  );
}

function Explore() {
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
      <PublicHeader active="explore" />
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

function CourseDetails({ course }: { course: Course }) {
  const [open, setOpen] = useState(0);
  const lessonContent = course.lessonContent ?? [];
  const lessonsForSection = (section: string, sectionIndex: number) => {
    const savedLessons = lessonContent.filter((lesson) => lesson.section === section);
    if (savedLessons.length) return savedLessons;
    return sectionIndex === 0
      ? course.sampleLessons.map((title) => ({ title, section, slides: [], links: [] }))
      : [`${section}: Part 1`, `${section}: Part 2`, `${section}: Practice`].map(
          (title) => ({ title, section, slides: [], links: [] }),
        );
  };
  return (
    <>
      <PublicHeader />
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
                src={course.instructorImage || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80"}
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
          <img src={course.image} alt={course.title} />
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
                      {lessonsForSection(section, index).map((lesson) => {
                        const lessonIndex = lessonContent.findIndex(
                          (savedLesson) => savedLesson.title === lesson.title,
                        );
                        return (
                        <button
                          onClick={() => go("lesson", course, lessonIndex >= 0 ? lessonIndex : 0)}
                          key={lesson.title}
                        >
                          <Icon
                            name="play"
                            size={17}
                          />
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
            <button className="download">
              <Icon name="download" />
              Download course overview
            </button>
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
}: {
  children: ReactNode;
  active: Page;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={`side ${open ? "open" : ""}`}>
        <Logo />
        <div className="side-label">
          STUDENT SPACE
        </div>
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
        </nav>
        <div className="side-user">
          <span>AK</span>
          <div>
            <b>Alex Kofi</b>
            <small>Student · Level 2</small>
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
            All systems operational
          </div>
          <button className="top-profile" onClick={() => go("profile")}>
            <span>AK</span>
            <Icon name="chevron" size={16} />
          </button>
        </header>
        <main className="workspace-main">{children}</main>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <AppShell active="dashboard">
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR LEARNING</span>
          <h1>Welcome back, Alex.</h1>
          <p>You're building real engineering skills—one lesson at a time.</p>
        </div>
        <Button variant="outline" onClick={() => go("explore")}>
          Explore courses
        </Button>
      </div>
      <section className="continue-card">
        <img src={courses[0].image} alt="RC plane course" />
        <div>
          <span className="badge">IN PROGRESS</span>
          <h2>{courses[0].title}</h2>
          <p>
            Next up: <b>{courses[0].sampleLessons[1]}</b>
          </p>
          <div className="progress-bar">
            <i style={{ width: "38%" }} />
          </div>
          <small>5 of {courses[0].lessons} lessons complete</small>
          <Button onClick={() => go("lesson", courses[0])}>
            Continue learning <Icon name="arrow" />
          </Button>
        </div>
        <div className="ring">
          <b>38%</b>
          <small>complete</small>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Explore more courses</h2>
        </div>
        <div className="course-grid">
          {courses.slice(1, 4).map((course, i) => (
            <CourseCard key={course.title} course={course} index={i} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Lesson({ course, lessonIndex }: LessonSelection) {
  const [started, setStarted] = useState(false);
  const lessonTitle =
    course.lessonContent?.[lessonIndex]?.title || course.sampleLessons[lessonIndex] || course.sampleLessons[0];
  const lesson = course.lessonContent?.[lessonIndex];
  return (
    <div className="lesson-shell">
      <header className="lesson-top">
        <Logo dark />
            <button className="crumb" onClick={() => go("course", course)}>
              {course.title}
            </button>
            <span>Lesson {lessonIndex + 1} of {course.lessons}</span>
      </header>
      <main className="lesson-content">
            <span className="eyebrow">
              {course.category.toUpperCase()} · {started ? `LESSON ${lessonIndex + 1}` : "OVERVIEW"}
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
                    This lesson is part of the {lesson?.section || "course curriculum"} section.
                  </p>
                  {lesson?.slides.length ? (
                    <div className="lesson-resource">
                      <b>Slides</b>
                      {lesson.slides.map((slide) => {
                        const resource = asResource(slide);
                        return (
                        <a href={resource.url} download={resource.name} target="_blank" rel="noreferrer" key={resource.name}>
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
                  {!lesson && <p>Lesson resources will be added by the instructor.</p>}
                </>
              ) : (
                <>
                  <h2>Lesson overview</h2>
                  <p>
                    In this lesson, you will learn the essential ideas, equipment,
                    and safety practices needed to continue confidently through
                    the course.
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

function ProgressPage() {
  return (
    <AppShell active="progress">
      <div className="page-title">
        <div>
          <span className="eyebrow">YOUR LEARNING</span>
          <h1>Progress & achievements</h1>
          <p>Track the practical skills you're building.</p>
        </div>
      </div>
      <section className="panel">
        <h2>Course progress</h2>
        {courses.slice(0, 3).map((course, index) => (
          <div className="skill-row" key={course.title}>
            <img src={course.image} alt="" />
            <div>
              <b>{course.title}</b>
              <span>{[46, 28, 12][index]}% complete</span>
              <div className="progress-bar">
                <i style={{ width: `${[46, 28, 12][index]}%` }} />
              </div>
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
            {register ? "JOIN THE COMMUNITY" : "WELCOME BACK"}
          </span>
          <h2>{register ? "Create your account" : "Sign in to continue"}</h2>
          <p>Authentication will be connected in the backend phase.</p>
          {register && (
            <label>
              Full name
              <input placeholder="Your name" />
            </label>
          )}
          <label>
            Email address
            <input type="email" placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input type="password" placeholder="At least 8 characters" />
          </label>
          <Button className="wide" onClick={() => go("dashboard")}>
            {register ? "Create account" : "Sign in"}
          </Button>
          <Button
            variant="outline"
            className="wide"
            onClick={() => go("instructor")}
          >
            Enter Instructor Workspace
          </Button>
          <p className="switch">
            <button onClick={() => setRegister(!register)}>
              {register ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

function ProfilePage() {
  return (
    <AppShell active="profile">
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
          <span className="profile-avatar">AK</span>
          <div>
            <h2>Alex Kofi</h2>
            <p>Student builder</p>
          </div>
        </div>
        <div className="profile-form">
          <label>
            Full name
            <input defaultValue="Alex Kofi" />
          </label>
          <label>
            Email address
            <input defaultValue="alex.kofi@example.com" />
          </label>
          <Button>Save changes</Button>
        </div>
      </section>
    </AppShell>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [selectedCourse, setSelectedCourse] = useState<Course>(courses[0]);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState(0);
  const [editingCourse, setEditingCourse] = useState<Course>();
  const [courseVersion, refreshCourses] = useState(0);
  const [courseLoadState, setCourseLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [courseLoadError, setCourseLoadError] = useState("");

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

  const saveCourse = (course: Course) => {
    const existingIndex = editingCourse
      ? courses.findIndex((item) => item.title === editingCourse.title)
      : -1;
    const nextCourses =
      existingIndex >= 0
        ? courses.map((item, index) => (index === existingIndex ? course : item))
        : [...courses, course];

    try {
      window.localStorage.setItem("elite-rc-courses", JSON.stringify(nextCourses));
    } catch (error) {
      console.error("Unable to save course locally.", error);
      return false;
    }

    courses = nextCourses;
    setSelectedCourse(course);
    setEditingCourse(undefined);
    refreshCourses((version) => version + 1);
    setPage("admin");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  };
  const deleteCourse = (course: Course) => {
    if (!window.confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    courses = courses.filter((item) => item.title !== course.title);
    window.localStorage.setItem("elite-rc-courses", JSON.stringify(courses));
    refreshCourses((version) => version + 1);
    setPage("admin");
  };
  navigate = (nextPage, course, lessonIndex) => {
    if (course) setSelectedCourse(course);
    setEditingCourse(nextPage === "builder" ? course : undefined);
    if (lessonIndex !== undefined) setSelectedLessonIndex(Math.max(0, lessonIndex));
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
  if (courses.length === 0) {
    return (
      <main className="auth">
        <section>
          <Logo />
          <div>
            <span className="eyebrow light">COURSE LIBRARY</span>
            <h1>No published courses yet.</h1>
            <p>Publish a course in Supabase, then refresh this page.</p>
            <Button onClick={() => window.location.reload()}>Refresh</Button>
          </div>
        </section>
      </main>
    );
  }
  return page === "home" ? (
    <Home />
  ) : page === "explore" ? (
    <Explore />
  ) : page === "course" ? (
    <CourseDetails course={selectedCourse} />
  ) : page === "dashboard" ? (
    <Dashboard />
  ) : page === "lesson" ? (
    <Lesson course={selectedCourse} lessonIndex={selectedLessonIndex} />
  ) : page === "progress" ? (
    <ProgressPage />
  ) : page === "admin" ? (
    <StaffOverview
      courses={courses}
      onNavigate={(nextPage, course) => go(nextPage, course)}
      onSaveCourse={saveCourse}
      onDeleteCourse={deleteCourse}
    />
  ) : page === "builder" ? (
    <CourseBuilderPage
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
  ) : (
    <ProfilePage />
  );
}
