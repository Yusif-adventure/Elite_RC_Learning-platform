// A small, safe text format for lesson text and quiz questions. It never
// produces HTML: the result is a tree that React renders, so anything an
// instructor types is shown as text.
//
// Full lesson text understands:
//   # Heading, ## Smaller heading, ### Smallest heading
//   - bullet and 1. numbered lists
//   > a callout
//   ```cpp ... ``` code blocks, `inline code`
//   **bold**, *italic*, [a link](https://example.com)
// Quiz text ("code" mode) only understands code blocks and `inline code`,
// and keeps every line break, so existing questions look the same.

export type Inline =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "bold"; children: Inline[] }
  | { type: "italic"; children: Inline[] }
  | { type: "link"; href: string; children: Inline[] };

export type Block =
  | { type: "paragraph"; lines: Inline[][] }
  | { type: "heading"; level: 1 | 2 | 3; content: Inline[] }
  | { type: "code"; language: string; text: string }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "quote"; lines: Inline[][] };

export type TextMode = "full" | "code";

const FENCE = /^\s*```\s*([\w+#-]*)\s*$/;
const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;

// Inline markers, tried in this order at each point of the text.
const INLINE_CODE = /`([^`\n]+)`/;
const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/;
const BOLD = /\*\*(?=\S)([^\n]*?\S)\*\*/;
const ITALIC = /(?<![\w*])[*_](?=\S)([^\n*_]*?\S)[*_](?![\w*])/;

export function parseInline(text: string, mode: TextMode = "full"): Inline[] {
  const patterns: [RegExp, (match: RegExpExecArray) => Inline][] = [
    [INLINE_CODE, (match) => ({ type: "code", text: match[1] })],
  ];
  if (mode === "full") {
    patterns.push(
      [LINK, (match) => ({ type: "link", href: match[2], children: parseInline(match[1], mode) })],
      [BOLD, (match) => ({ type: "bold", children: parseInline(match[1], mode) })],
      [ITALIC, (match) => ({ type: "italic", children: parseInline(match[1], mode) })],
    );
  }

  const result: Inline[] = [];
  let rest = text;
  while (rest) {
    let first: { match: RegExpExecArray; make: (match: RegExpExecArray) => Inline } | null = null;
    for (const [pattern, make] of patterns) {
      const match = pattern.exec(rest);
      if (match && (!first || match.index < first.match.index)) first = { match, make };
    }
    if (!first) {
      result.push({ type: "text", text: rest });
      break;
    }
    if (first.match.index > 0) result.push({ type: "text", text: rest.slice(0, first.match.index) });
    result.push(first.make(first.match));
    rest = rest.slice(first.match.index + first.match[0].length);
  }
  return result;
}

export function parseRichText(text: string, mode: TextMode = "full"): Block[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const endParagraph = () => {
    // Quiz text keeps blank lines inside a paragraph, as it was typed.
    while (paragraph.length && !paragraph[paragraph.length - 1].trim()) paragraph.pop();
    if (paragraph.length) {
      blocks.push({ type: "paragraph", lines: paragraph.map((line) => parseInline(line, mode)) });
    }
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = FENCE.exec(line);
    if (fence) {
      const code: string[] = [];
      let end = index + 1;
      while (end < lines.length && !FENCE.test(lines[end])) {
        code.push(lines[end]);
        end += 1;
      }
      // An unclosed fence is plain text, so a stray ``` never hides the rest.
      if (end < lines.length) {
        endParagraph();
        blocks.push({ type: "code", language: fence[1].toLowerCase(), text: code.join("\n") });
        index = end;
        continue;
      }
    }

    if (mode === "code") {
      if (!line.trim() && !paragraph.length) continue;
      paragraph.push(line);
      continue;
    }

    if (!line.trim()) {
      endParagraph();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      endParagraph();
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        content: parseInline(heading[2].trim(), mode),
      });
      continue;
    }
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    if (bullet || numbered) {
      endParagraph();
      const ordered = Boolean(numbered);
      const pattern = ordered ? NUMBERED : BULLET;
      const items: Inline[][] = [];
      let end = index;
      while (end < lines.length) {
        const item = pattern.exec(lines[end]);
        if (!item) break;
        items.push(parseInline(item[1], mode));
        end += 1;
      }
      blocks.push({ type: "list", ordered, items });
      index = end - 1;
      continue;
    }
    const quote = QUOTE.exec(line);
    if (quote) {
      endParagraph();
      const quoted: Inline[][] = [];
      let end = index;
      while (end < lines.length) {
        const item = QUOTE.exec(lines[end]);
        if (!item) break;
        quoted.push(parseInline(item[1], mode));
        end += 1;
      }
      blocks.push({ type: "quote", lines: quoted });
      index = end - 1;
      continue;
    }
    paragraph.push(line);
  }
  endParagraph();
  return blocks;
}
