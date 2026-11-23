import { Fragment, type ReactNode } from "react";
import { parseRichText, type Inline } from "./textFormat";
import "./richText.css";

function renderInline(parts: Inline[]): ReactNode {
  return parts.map((part, index) => {
    switch (part.type) {
      case "text":
        return <Fragment key={index}>{part.text}</Fragment>;
      case "code":
        return <code key={index}>{part.text}</code>;
      case "bold":
        return <strong key={index}>{renderInline(part.children)}</strong>;
      case "italic":
        return <em key={index}>{renderInline(part.children)}</em>;
      case "link":
        return (
          <a key={index} href={part.href} target="_blank" rel="noreferrer noopener">
            {renderInline(part.children)}
          </a>
        );
    }
  });
}

function renderLines(lines: Inline[][]): ReactNode {
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {renderInline(line)}
    </Fragment>
  ));
}

// Lesson text with headings, lists, callouts, code and links.
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`rich-text ${className}`.trim()}>
      {parseRichText(text).map((block, index) => {
        switch (block.type) {
          case "paragraph":
            return <p key={index}>{renderLines(block.lines)}</p>;
          case "heading": {
            // The lesson title is the page's h1, so lesson headings start at h2.
            const Tag = (["h2", "h3", "h4"] as const)[block.level - 1];
            return <Tag key={index}>{renderInline(block.content)}</Tag>;
          }
          case "code":
            return <CodeBlock key={index} language={block.language} text={block.text} />;
          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item)}</li>
                ))}
              </Tag>
            );
          }
          case "quote":
            return <blockquote key={index}>{renderLines(block.lines)}</blockquote>;
        }
      })}
    </div>
  );
}

export function CodeBlock({ language, text }: { language?: string; text: string }) {
  return (
    <pre className="code-block" data-language={language || undefined}>
      <code>{text}</code>
    </pre>
  );
}

// Quiz questions, choices and explanations: keeps line breaks, and shows
// ```code blocks``` and `inline code`. Made only of spans, because it sits
// inside a <legend>, <label> or <h4>, where block elements do not belong.
export function QuizText({ text }: { text: string }) {
  const blocks = parseRichText(text, "code");
  const simple = blocks.length === 1 && blocks[0].type === "paragraph";
  if (simple && blocks[0].type === "paragraph") {
    return <span className="quiz-text">{renderLines(blocks[0].lines)}</span>;
  }
  return (
    <span className="quiz-text">
      {blocks.map((block, index) =>
        block.type === "code" ? (
          <span key={index} className="code-block" role="presentation" data-language={block.language || undefined}>
            <code>{block.text}</code>
          </span>
        ) : block.type === "paragraph" ? (
          <span key={index} className="quiz-text-line">
            {renderLines(block.lines)}
          </span>
        ) : null,
      )}
    </span>
  );
}
