// Every page has its own address, so the browser's Back button, refreshing,
// and sharing a link all work. Kept free of React so it can be tested alone.

export type Route =
  | { page: "home" }
  | { page: "explore"; category?: string; level?: string; search?: string }
  | { page: "about" }
  | { page: "privacy" }
  | { page: "terms" }
  | { page: "course"; courseId: string }
  | { page: "lesson"; courseId: string; lessonIndex: number }
  | { page: "auth"; register?: boolean; next?: string }
  | { page: "reset-password" }
  | { page: "dashboard" }
  | { page: "progress" }
  | { page: "profile" }
  | { page: "admin" }
  | { page: "instructor" }
  | { page: "members" }
  | { page: "builder"; courseId?: string }
  | { page: "not-found" };

export type Page = Route["page"];

// The home page opens straight away, so its animations start without waiting
// for the course library; it fills in the course parts when they arrive.
// Every other page needs the courses before it can show anything.
export function waitsForCourses(page: Page): boolean {
  return page !== "home";
}

const fixedPages: Record<string, Route> = {
  "/": { page: "home" },
  "/about": { page: "about" },
  "/privacy": { page: "privacy" },
  "/privacy-policy": { page: "privacy" },
  "/terms": { page: "terms" },
  "/terms-of-service": { page: "terms" },
  "/sign-in": { page: "auth" },
  "/join": { page: "auth", register: true },
  "/reset-password": { page: "reset-password" },
  "/dashboard": { page: "dashboard" },
  "/my-learning": { page: "progress" },
  "/profile": { page: "profile" },
  "/staff": { page: "admin" },
  "/staff/instructors": { page: "instructor" },
  "/staff/members": { page: "members" },
  "/staff/courses/new": { page: "builder" },
};

export function parseRoute(pathname: string, search: string): Route {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const fixed = fixedPages[path];
  if (fixed?.page === "auth") {
    // Only addresses on this site, so a link cannot send someone elsewhere.
    const next = new URLSearchParams(search).get("next");
    return next?.startsWith("/") && !next.startsWith("//") ? { ...fixed, next } : fixed;
  }
  if (fixed) return fixed;

  const parts = path.split("/").slice(1).map(decodeURIComponent);
  if (parts[0] === "courses") {
    if (parts.length === 1) {
      const query = new URLSearchParams(search);
      const filters = {
        category: query.get("category") ?? undefined,
        level: query.get("level") ?? undefined,
        search: query.get("q") ?? undefined,
      };
      return {
        page: "explore",
        ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
      };
    }
    if (parts.length === 2) return { page: "course", courseId: parts[1] };
    if (parts.length === 4 && parts[2] === "lessons" && /^[1-9]\d*$/.test(parts[3])) {
      return { page: "lesson", courseId: parts[1], lessonIndex: Number(parts[3]) - 1 };
    }
  }
  if (parts[0] === "staff" && parts[1] === "courses" && parts.length === 4 && parts[3] === "edit") {
    return { page: "builder", courseId: parts[2] };
  }
  return { page: "not-found" };
}

export function routePath(route: Route): string {
  const id = (value: string) => encodeURIComponent(value);
  switch (route.page) {
    case "explore": {
      const query = new URLSearchParams();
      if (route.category?.trim()) query.set("category", route.category.trim());
      if (route.level?.trim()) query.set("level", route.level.trim());
      if (route.search?.trim()) query.set("q", route.search.trim());
      const text = query.toString();
      return text ? `/courses?${text}` : "/courses";
    }
    case "course":
      return `/courses/${id(route.courseId)}`;
    case "lesson":
      return `/courses/${id(route.courseId)}/lessons/${route.lessonIndex + 1}`;
    case "builder":
      return route.courseId ? `/staff/courses/${id(route.courseId)}/edit` : "/staff/courses/new";
    case "auth": {
      const base = route.register ? "/join" : "/sign-in";
      return route.next ? `${base}?next=${encodeURIComponent(route.next)}` : base;
    }
    case "not-found":
      return "/";
    default: {
      const match = Object.entries(fixedPages).find(([, fixed]) => fixed.page === route.page);
      return match ? match[0] : "/";
    }
  }
}

// For a whole address such as "/courses?category=IoT".
export function parsePath(path: string): Route {
  const queryStart = path.indexOf("?");
  return queryStart === -1
    ? parseRoute(path, "")
    : parseRoute(path.slice(0, queryStart), path.slice(queryStart));
}
