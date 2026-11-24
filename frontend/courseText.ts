// Small text helpers for course details. Kept free of React so they can be tested alone.

const ESCAPES: Record<string, string> = { n: "\n", t: "\t", "\\": "\\" };

// Course descriptions can use \n for a new line and \t for a tab, as well as
// real line breaks. \\ shows a single backslash. Anything else is left as typed.
export function descriptionText(text: string): string {
  return text.replace(/\\([nt\\])/g, (_match, code: string) => ESCAPES[code]);
}
