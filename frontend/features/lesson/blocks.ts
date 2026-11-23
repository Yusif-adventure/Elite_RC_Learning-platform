// Lesson blocks: the pieces an instructor stacks to build a lesson. The
// backend checks the same rules in server.js (BLOCK_RULES).

export type LessonBlock =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; url: string; alt: string; caption?: string }
  | { id: string; type: "youtube"; url: string; title?: string }
  | { id: string; type: "pdf"; url: string; name: string }
  | { id: string; type: "video"; url: string; name: string }
  | { id: string; type: "html"; html: string; title?: string }
  | { id: string; type: "arrange"; code: string; title?: string; instructions?: string };

export type BlockType = LessonBlock["type"];

export const MAX_ARRANGE_LINES = 40;

export const BLOCK_TYPES: { type: BlockType; label: string; description: string }[] = [
  { type: "text", label: "Text", description: "Notes with headings, lists and code" },
  { type: "image", label: "Image", description: "A picture or diagram" },
  { type: "youtube", label: "YouTube", description: "A video that plays in the lesson" },
  { type: "pdf", label: "PDF", description: "Read on the page or download" },
  { type: "video", label: "Video file", description: "An uploaded MP4 clip" },
  { type: "arrange", label: "Arrange the lines", description: "Put shuffled code in order" },
  { type: "html", label: "HTML / CSS / JS", description: "Your own design or activity" },
];

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function newBlock(type: BlockType): LessonBlock {
  const id = newId();
  switch (type) {
    case "text":
      return { id, type, text: "" };
    case "image":
      return { id, type, url: "", alt: "" };
    case "youtube":
      return { id, type, url: "" };
    case "pdf":
    case "video":
      return { id, type, url: "", name: "" };
    case "html":
      return { id, type, html: "" };
    case "arrange":
      return { id, type, code: "" };
  }
}

const YOUTUBE_LINK = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\/\S+$/i;

// The video id from any usual YouTube link: watch?v=, youtu.be/, shorts/,
// embed/ and live/.
export function youtubeId(link: string): string | null {
  try {
    const url = new URL(/^https?:\/\//i.test(link.trim()) ? link.trim() : `https://${link.trim()}`);
    const host = url.hostname.replace(/^(www|m)\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/")[1] || null;
    else if (["youtube.com", "youtube-nocookie.com"].includes(host)) {
      id = url.searchParams.get("v");
      const [, kind, value] = url.pathname.split("/");
      if (!id && ["shorts", "embed", "live"].includes(kind)) id = value || null;
    }
    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

// The lines of an arrange-the-lines block, in the right order. Blank lines
// are left out; each line keeps its indentation, which is part of the clue.
export function arrangeLines(code: string): string[] {
  return code.replace(/\r\n?/g, "\n").split("\n").filter((line) => line.trim()).map((line) => line.replace(/\s+$/, ""));
}

// Shuffles the lines, never leaving them already in order when they can be
// out of order. `random` is replaceable for tests.
export function shuffleLines(lines: string[], random: () => number = Math.random): string[] {
  if (new Set(lines).size < 2) return [...lines];
  for (let tries = 0; tries < 20; tries += 1) {
    const shuffled = [...lines];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
    }
    if (shuffled.some((line, index) => line !== lines[index])) return shuffled;
  }
  // Very unlikely: move the first line to the end.
  return [...lines.slice(1), lines[0]];
}

// Which lines are in the right place. Lines are compared by their text, so
// two identical lines (say, two closing braces) can be in either spot.
export function checkOrder(order: string[], answer: string[]): boolean[] {
  return order.map((line, index) => line === answer[index]);
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// What still needs doing before a block can be saved, or "" when it is ready.
export function blockProblem(block: LessonBlock): string {
  switch (block.type) {
    case "text":
      return block.text.trim() ? "" : "Add some text to this text block, or remove it.";
    case "image":
      if (!block.url) return "Upload a picture for this image block, or remove it.";
      return block.alt.trim() ? "" : "Describe the picture in a few words, for learners who cannot see it.";
    case "youtube":
      return youtubeId(block.url) && YOUTUBE_LINK.test(block.url.trim())
        ? ""
        : "Use a full YouTube link for this video block, like https://www.youtube.com/watch?v=...";
    case "pdf":
      return block.url ? "" : "Upload a PDF for this PDF block, or remove it.";
    case "video":
      return block.url ? "" : "Upload a video for this video block, or remove it.";
    case "html":
      return block.html.trim() ? "" : "Add some HTML to this HTML block, or remove it.";
    case "arrange": {
      const count = arrangeLines(block.code).length;
      if (count < 2) return "An arrange-the-lines block needs at least 2 lines of code.";
      return count > MAX_ARRANGE_LINES ? `An arrange-the-lines block can have up to ${MAX_ARRANGE_LINES} lines.` : "";
    }
  }
}

// Wraps instructor HTML for a sandboxed frame. The frame has no access to the
// site, so the extra script only reports the content's height, which lets
// the frame grow to fit. Links open in a new tab.
export const FRAME_MESSAGE = "elite-rc-block-height";

export function framedHtml(html: string, frameId: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base target="_blank">
<style>
  html { color-scheme: light; }
  body { margin: 0; padding: 4px; font-family: "DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif; color: #10233e; line-height: 1.5; overflow-wrap: anywhere; }
  img, video, canvas, svg { max-width: 100%; height: auto; }
</style>
</head>
<body>
${html}
<script>
(function () {
  var last = 0;
  function report() {
    var height = Math.ceil(document.documentElement.scrollHeight);
    if (height !== last) {
      last = height;
      parent.postMessage({ type: ${JSON.stringify(FRAME_MESSAGE)}, frame: ${JSON.stringify(frameId)}, height: height }, "*");
    }
  }
  if (window.ResizeObserver) new ResizeObserver(report).observe(document.documentElement);
  window.addEventListener("load", report);
  setInterval(report, 1000);
  report();
})();
</script>
</body>
</html>`;
}
