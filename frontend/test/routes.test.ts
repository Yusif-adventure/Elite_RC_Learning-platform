import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePath, parseRoute, routePath } from "../routes.ts";

const addresses = [
  ["/", { page: "home" }],
  ["/courses", { page: "explore" }],
  ["/courses?category=RC+Cars", { page: "explore", category: "RC Cars" }],
  ["/courses?category=Electronics&level=Beginner&q=wing", { page: "explore", category: "Electronics", level: "Beginner", search: "wing" }],
  ["/courses/7b1f8a54-3c0e", { page: "course", courseId: "7b1f8a54-3c0e" }],
  ["/courses/7b1f8a54-3c0e/lessons/1", { page: "lesson", courseId: "7b1f8a54-3c0e", lessonIndex: 0 }],
  ["/courses/7b1f8a54-3c0e/lessons/3", { page: "lesson", courseId: "7b1f8a54-3c0e", lessonIndex: 2 }],
  ["/about", { page: "about" }],
  ["/privacy", { page: "privacy" }],
  ["/terms", { page: "terms" }],
  ["/sign-in", { page: "auth" }],
  ["/join", { page: "auth", register: true }],
  ["/sign-in?next=%2Fcourses%2Fabc%2Flessons%2F2", { page: "auth", next: "/courses/abc/lessons/2" }],
  ["/reset-password", { page: "reset-password" }],
  ["/dashboard", { page: "dashboard" }],
  ["/my-learning", { page: "progress" }],
  ["/profile", { page: "profile" }],
  ["/staff", { page: "admin" }],
  ["/staff/instructors", { page: "instructor" }],
  ["/staff/members", { page: "members" }],
  ["/staff/courses/new", { page: "builder" }],
  ["/staff/courses/7b1f8a54-3c0e/edit", { page: "builder", courseId: "7b1f8a54-3c0e" }],
] as const;

for (const [address, route] of addresses) {
  test(`${address} opens ${route.page}`, () => {
    const [pathname, search = ""] = address.split("?");
    assert.deepEqual(parseRoute(pathname, search ? `?${search}` : ""), route);
  });

  test(`${route.page} is written back as ${address}`, () => {
    assert.equal(routePath(route), address);
  });
}

const unknownAddresses = [
  "/nope",
  "/courses/abc/lessons/0",
  "/courses/abc/lessons/two",
  "/courses/abc/lessons/-1",
  "/courses/abc/extra",
  "/staff/courses/abc",
];

for (const address of unknownAddresses) {
  test(`${address} is not a page`, () => {
    assert.deepEqual(parseRoute(address, ""), { page: "not-found" });
  });
}

test("a trailing slash opens the same page", () => {
  assert.deepEqual(parseRoute("/courses/", ""), { page: "explore" });
  assert.deepEqual(parseRoute("/about/", ""), { page: "about" });
  assert.deepEqual(parseRoute("/privacy/", ""), { page: "privacy" });
  assert.deepEqual(parseRoute("/terms/", ""), { page: "terms" });
});

test("privacy policy and terms aliases open their respective pages", () => {
  assert.deepEqual(parseRoute("/privacy-policy", ""), { page: "privacy" });
  assert.deepEqual(parseRoute("/terms-of-service", ""), { page: "terms" });
});

test("course ids with special characters survive the address bar", () => {
  const route = { page: "course", courseId: "a b/c" } as const;
  assert.equal(routePath(route), "/courses/a%20b%2Fc");
  assert.deepEqual(parseRoute("/courses/a%20b%2Fc", ""), route);
});

test("empty catalog filters are left out of the address", () => {
  assert.equal(routePath({ page: "explore", category: "", level: "", search: "  " }), "/courses");
});

test("signing in only returns to pages on this site", () => {
  assert.deepEqual(parseRoute("/sign-in", "?next=https%3A%2F%2Fevil.example"), { page: "auth" });
  assert.deepEqual(parseRoute("/sign-in", "?next=%2F%2Fevil.example"), { page: "auth" });
});

test("a saved address with filters opens the same page", () => {
  assert.deepEqual(parsePath("/courses?category=IoT"), { page: "explore", category: "IoT" });
  assert.deepEqual(parsePath("/courses/abc/lessons/2"), { page: "lesson", courseId: "abc", lessonIndex: 1 });
});
