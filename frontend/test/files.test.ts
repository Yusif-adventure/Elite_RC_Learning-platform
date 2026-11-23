import assert from "node:assert/strict";
import { test } from "node:test";
import { downloadLink, isPdf } from "../features/lesson/files";

const stored = "https://abc.supabase.co/storage/v1/object/public/lesson-resources/slides/123-blink.pdf";

test("PDFs are recognised by their name or their link", () => {
  assert.equal(isPdf({ name: "Blink.PDF", url: "https://example.com/file" }), true);
  assert.equal(isPdf({ name: "slides", url: stored }), true);
  assert.equal(isPdf({ name: "deck.pptx", url: "https://example.com/deck.pptx" }), false);
  assert.equal(isPdf({ name: "notes", url: "https://example.com/notes.pdf?version=2" }), true);
});

test("files in Supabase storage download under their own name", () => {
  const link = new URL(downloadLink({ name: "Blink sheet.pdf", url: stored }));
  assert.equal(link.searchParams.get("download"), "Blink sheet.pdf");
  assert.equal(link.pathname, new URL(stored).pathname);
});

test("files elsewhere keep their link", () => {
  assert.equal(downloadLink({ name: "a.pdf", url: "https://example.com/a.pdf" }), "https://example.com/a.pdf");
  assert.equal(downloadLink({ name: "a.pdf", url: "not a link" }), "not a link");
});
