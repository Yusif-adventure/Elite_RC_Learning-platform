import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { RichText } from "../../RichText";
import {
  FRAME_MESSAGE,
  arrangeLines,
  checkOrder,
  fillTemplate,
  framedHtml,
  moveItem,
  shuffleLines,
  youtubeId,
  type LessonBlock,
} from "./blocks";
import { PdfResource } from "./PdfResource";
import "./lesson.css";

export function LessonBlocks({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className="lesson-blocks">
      {blocks.map((block) => (
        <LessonBlockView block={block} key={block.id} />
      ))}
    </div>
  );
}

export function LessonBlockView({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case "text":
      return <RichText className="lesson-block" text={block.text} />;
    case "image":
      return <LessonImage url={block.url} alt={block.alt} caption={block.caption} />;
    case "youtube":
      return <YouTubeBlock url={block.url} title={block.title} />;
    case "pdf":
      return (
        <div className="lesson-block">
          <PdfResource file={block} label="PDF" />
        </div>
      );
    case "video":
      return (
        <div className="lesson-block lesson-video">
          <video controls preload="metadata" src={block.url}>
            Your browser does not support video playback.
          </video>
        </div>
      );
    case "html":
      return <SandboxedHtml html={block.html} title={block.title || "Interactive activity"} />;
    case "template":
      return <SandboxedHtml html={fillTemplate(block.html, block.fields, block.values)} title={block.templateName} />;
    case "arrange":
      return <ArrangeLines code={block.code} title={block.title} instructions={block.instructions} />;
  }
}

// Pictures can be linked from other sites, so one that stops loading shows
// its description in a box instead of a broken image.
function LessonImage({ url, alt, caption }: { url: string; alt: string; caption?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="lesson-block lesson-image">
      {failed ? (
        <div className="lesson-image-missing" role="img" aria-label={alt}>
          Picture unavailable: {alt}
        </div>
      ) : (
        <img src={url} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function YouTubeBlock({ url, title }: { url: string; title?: string }) {
  const id = youtubeId(url);
  if (!id) {
    return (
      <p className="lesson-block">
        <a href={url} target="_blank" rel="noreferrer">
          Watch the video on YouTube
        </a>
      </p>
    );
  }
  return (
    <div className="lesson-block lesson-youtube">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
        title={title || "Lesson video"}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

// Instructor HTML, CSS and JavaScript run in a sandboxed frame without
// allow-same-origin, so the frame gets its own blank origin: it cannot read
// the learner's sign-in, cookies or storage, or touch this page.
export function SandboxedHtml({ html, title }: { html: string; title: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameId = useMemo(() => Math.random().toString(36).slice(2), []);
  const [height, setHeight] = useState(160);
  const srcDoc = useMemo(() => framedHtml(html, frameId), [html, frameId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { type?: string; frame?: string; height?: number };
      if (data?.type !== FRAME_MESSAGE || data.frame !== frameId || typeof data.height !== "number") return;
      // The frame's 1px border on each side is added, and nothing more, so
      // its height settles instead of creeping up.
      setHeight(Math.min(Math.max(Math.ceil(data.height) + 2, 60), 4000));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameId]);

  return (
    <div className="lesson-block lesson-html">
      <iframe
        ref={frameRef}
        title={title}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
        referrerPolicy="no-referrer"
        style={{ height }}
      />
    </div>
  );
}

const CHEERS = [
  "Nailed it! The compiler would be proud.",
  "Perfect order. Your Arduino just did a little happy blink.",
  "Every line in place. Smooth as a well-trimmed plane.",
];

export function ArrangeLines({
  code,
  title,
  instructions,
}: {
  code: string;
  title?: string;
  instructions?: string;
}) {
  const answer = useMemo(() => arrangeLines(code), [code]);
  const [order, setOrder] = useState(() => shuffleLines(answer));
  const [marks, setMarks] = useState<boolean[] | null>(null);
  const [tries, setTries] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [cheer] = useState(() => CHEERS[Math.floor(Math.random() * CHEERS.length)]);

  // A new answer (the instructor edited the code) starts a fresh puzzle.
  useEffect(() => {
    setOrder(shuffleLines(answer));
    setMarks(null);
    setTries(0);
    setRevealed(false);
  }, [answer]);

  const solved = Boolean(marks && marks.every(Boolean));
  const rightCount = marks ? marks.filter(Boolean).length : 0;

  const move = (from: number, to: number) => {
    setOrder((current) => moveItem(current, from, to));
    setMarks(null);
    setSelected(null);
  };
  const check = () => {
    setMarks(checkOrder(order, answer));
    setTries((count) => count + 1);
  };
  const reshuffle = () => {
    setOrder(shuffleLines(answer));
    setMarks(null);
    setSelected(null);
    setRevealed(false);
  };
  const showAnswer = () => {
    setOrder(answer);
    setMarks(answer.map(() => true));
    setSelected(null);
    setRevealed(true);
  };
  const onDrop = (event: DragEvent<HTMLLIElement>, index: number) => {
    event.preventDefault();
    if (dragging !== null) move(dragging, index);
    setDragging(null);
  };
  // Tapping one line, then another, swaps them into place: the easy way on a phone.
  const tap = (index: number) => {
    if (selected === null) setSelected(index);
    else if (selected === index) setSelected(null);
    else move(selected, index);
  };

  return (
    <section className="lesson-block arrange" aria-label={title || "Arrange the lines"}>
      <header className="arrange-head">
        <span className="arrange-badge">Puzzle</span>
        <h3>{title || "Arrange the lines"}</h3>
        <p>
          {instructions ||
            "These lines of code got shuffled. Drag them, use the arrows, or tap one line and then the spot it belongs, to put them back in order."}
        </p>
      </header>
      <ol className="arrange-lines">
        {order.map((line, index) => {
          const mark = marks?.[index];
          return (
            <li
              key={`${index}-${line}`}
              className={[
                "arrange-line",
                mark === true ? "is-right" : "",
                mark === false ? "is-wrong" : "",
                dragging === index ? "is-dragging" : "",
                selected === index ? "is-selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              draggable={!solved}
              onDragStart={() => setDragging(index)}
              onDragEnd={() => setDragging(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDrop(event, index)}
            >
              <button
                type="button"
                className="arrange-code"
                onClick={() => !solved && tap(index)}
                aria-pressed={selected === index}
                aria-label={`Line ${index + 1}: ${line.trim()}${selected === index ? ", selected" : ""}`}
                disabled={solved}
              >
                <code>{line}</code>
              </button>
              {mark !== undefined && (
                <span className="arrange-mark">
                  {mark ? "✓ Right place" : "✗ Not here"}
                </span>
              )}
              <span className="arrange-move">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={solved || index === 0}
                  aria-label={`Move line ${index + 1} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={solved || index === order.length - 1}
                  aria-label={`Move line ${index + 1} down`}
                >
                  ↓
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="arrange-actions">
        {!solved && (
          <button type="button" className="btn primary" onClick={check}>
            <span>Check my order</span>
          </button>
        )}
        <button type="button" className="btn outline" onClick={reshuffle}>
          <span>{solved ? "Play again" : "Shuffle"}</span>
        </button>
        {!solved && tries >= 2 && (
          <button type="button" className="btn ghost" onClick={showAnswer}>
            <span>Show me the answer</span>
          </button>
        )}
      </div>
      <p className={`arrange-result${solved ? " is-solved" : ""}`} role="status" aria-live="polite">
        {solved && revealed
          ? "Here is the right order. Shuffle and try it again from memory!"
          : solved
          ? cheer
          : marks
            ? `${rightCount} of ${answer.length} lines in the right place. Keep going!`
            : ""}
      </p>
    </section>
  );
}
