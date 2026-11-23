// Several pasted lines become separate learning outcomes, without list
// markers such as "-", "•", "*" or "1.".
export function splitOutcomes(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•–]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}
