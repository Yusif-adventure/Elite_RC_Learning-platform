// One list for the home page, the catalog filters, and the course builder.
export const CATEGORIES = [
  { name: "RC Planes", icon: "plane", blurb: "Aerodynamics & flight" },
  { name: "RC Cars", icon: "car", blurb: "Speed & control" },
  { name: "RC Boats", icon: "boat", blurb: "Marine engineering" },
  { name: "Electronics", icon: "chip", blurb: "Power & circuits" },
  { name: "Robotics", icon: "bot", blurb: "Build intelligent machines" },
  { name: "IoT", icon: "wifi", blurb: "Connected projects" },
] as const;

export const CATEGORY_NAMES: string[] = CATEGORIES.map((category) => category.name);

// The standard categories, then any other category a course already uses,
// so no course is left without a filter.
export function catalogCategories(courseCategories: string[]): string[] {
  const extras = courseCategories
    .map((category) => category.trim())
    .filter((category) => category && !CATEGORY_NAMES.includes(category));
  return [...new Set([...CATEGORY_NAMES, ...extras])];
}
