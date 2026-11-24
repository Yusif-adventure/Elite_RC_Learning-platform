import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { RichText } from "../../RichText";
import {
  FRAME_MESSAGE,
  arrangeLines,
  checkOrder,
  dragShift,
  dropIndex,
  fillTemplate,
  framedHtml,
  moveItem,
  shuffleItems,
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
  "Flawless! That sketch would upload first time.",
  "Zero errors, all vibes. Your code is cleared for take-off. ✈️",
  "Look at you, putting code in order like a pro.",
  "Bang on! Even the Semicolon Police are impressed.",
];

type Line = { id: number; text: string };
type Drag = {
  id: number;
  from: number;
  over: number;
  startY: number;
  dy: number;
  // Where every row was when the drag started.
  rows: { top: number; height: number }[];
  slot: number;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

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
  const lines = useMemo<Line[]>(() => answer.map((text, id) => ({ id, text })), [answer]);
  const shuffle = () => shuffleItems(lines, (line) => line.text);
  const [order, setOrder] = useState<Line[]>(shuffle);
  const [marks, setMarks] = useState<boolean[] | null>(null);
  const [tries, setTries] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [cheer] = useState(() => CHEERS[Math.floor(Math.random() * CHEERS.length)]);
  const rowRefs = useRef(new Map<number, HTMLLIElement>());
  // Where each row was before a reorder, so it can glide to its new place.
  const before = useRef(new Map<number, number>());

  // A new answer (the instructor edited the code) starts a fresh puzzle.
  useEffect(() => {
    setOrder(shuffle());
    setMarks(null);
    setTries(0);
    setRevealed(false);
  }, [lines]);

  // The glide: each row starts where it was and slides to where it is now.
  useLayoutEffect(() => {
    const previous = before.current;
    before.current = new Map();
    if (!previous.size || prefersReducedMotion()) return;
    for (const [id, row] of rowRefs.current) {
      const was = previous.get(id);
      if (was === undefined) continue;
      const delta = was - row.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) continue;
      row.style.transition = "none";
      row.style.transform = `translateY(${delta}px)`;
      void row.offsetHeight;
      row.style.transition = "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)";
      row.style.transform = "";
      row.addEventListener(
        "transitionend",
        () => {
          row.style.transition = "";
        },
        { once: true },
      );
    }
  }, [order]);

  const rememberPositions = () => {
    before.current = new Map(
      [...rowRefs.current].map(([id, row]) => [id, row.getBoundingClientRect().top]),
    );
  };

  const solved = Boolean(marks && marks.every(Boolean));
  const rightCount = marks ? marks.filter(Boolean).length : 0;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    rememberPositions();
    setOrder((current) => moveItem(current, from, to));
    setMarks(null);
    setSelected(null);
  };
  const check = () => {
    setMarks(checkOrder(order.map((line) => line.text), answer));
    setTries((count) => count + 1);
  };
  const reshuffle = () => {
    rememberPositions();
    setOrder(shuffle());
    setMarks(null);
    setSelected(null);
    setRevealed(false);
  };
  const showAnswer = () => {
    rememberPositions();
    setOrder(lines);
    setMarks(answer.map(() => true));
    setSelected(null);
    setRevealed(true);
  };
  // Tapping one line, then another, moves it there: an easy way on a phone.
  const tap = (index: number) => {
    if (selected === null) setSelected(index);
    else if (selected === index) setSelected(null);
    else move(selected, index);
  };

  // Dragging by the handle, with a mouse, pen or finger. The row follows the
  // pointer and the others slide aside; the order only changes on release.
  const startDrag = (event: PointerEvent<HTMLButtonElement>, index: number) => {
    if (solved || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    // Keeps the drag going when the pointer leaves the handle.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some browsers refuse capture for some pointers; the drag still works.
    }
    const rows = order.map((line) => {
      const rect = rowRefs.current.get(line.id)!.getBoundingClientRect();
      return { top: rect.top, height: rect.height };
    });
    const slot = rows.length > 1 ? Math.abs(rows[1].top - rows[0].top) : rows[0].height + 8;
    setSelected(null);
    setDrag({ id: order[index].id, from: index, over: index, startY: event.clientY, dy: 0, rows, slot });
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const dy = event.clientY - drag.startY;
    const row = drag.rows[drag.from];
    const over = dropIndex(drag.rows, drag.from, row.top + row.height / 2 + dy);
    setDrag({ ...drag, dy, over });
  };
  const endDrag = () => {
    if (!drag) return;
    const { from, over } = drag;
    rememberPositions();
    setDrag(null);
    if (from !== over) {
      setOrder((current) => moveItem(current, from, over));
      setMarks(null);
    }
  };
  // The handle also works with the keyboard: arrow keys move the line.
  const keyMove = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (solved) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const to = index + (event.key === "ArrowUp" ? -1 : 1);
      move(index, to);
      requestAnimationFrame(() => {
        rowRefs.current.get(order[index].id)?.querySelector<HTMLButtonElement>(".arrange-handle")?.focus();
      });
    }
  };

  const rowStyle = (index: number, line: Line): CSSProperties | undefined => {
    if (!drag) return undefined;
    if (line.id === drag.id) return { transform: `translateY(${drag.dy}px)`, transition: "none" };
    const shift = dragShift(index, drag.from, drag.over, drag.slot);
    return { transform: shift ? `translateY(${shift}px)` : undefined, transition: "transform 160ms ease" };
  };

  return (
    <section className="lesson-block arrange" aria-label={title || "Arrange the lines"}>
      <header className="arrange-head">
        <span className="arrange-badge">Puzzle</span>
        <h3>{title || "Arrange the lines"}</h3>
        <p>
          {instructions ||
            "These lines of code got shuffled. Drag them by the handle, use the arrows, or tap one line and then the spot it belongs, to put them back in order."}
        </p>
      </header>
      <ol className={`arrange-lines${drag ? " is-dragging" : ""}`}>
        {order.map((line, index) => {
          const mark = marks?.[index];
          return (
            <li
              key={line.id}
              ref={(element) => {
                if (element) rowRefs.current.set(line.id, element);
                else rowRefs.current.delete(line.id);
              }}
              style={rowStyle(index, line)}
              className={[
                "arrange-line",
                mark === true ? "is-right" : "",
                mark === false ? "is-wrong" : "",
                drag?.id === line.id ? "is-dragged" : "",
                selected === index ? "is-selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <button
                type="button"
                className="arrange-handle"
                aria-label={`Move line ${index + 1}: drag, or use the up and down arrow keys`}
                disabled={solved}
                onPointerDown={(event) => startDrag(event, index)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={(event) => keyMove(event, index)}
              >
                <svg viewBox="0 0 12 20" aria-hidden="true">
                  <circle cx="3" cy="4" r="1.6" /><circle cx="9" cy="4" r="1.6" />
                  <circle cx="3" cy="10" r="1.6" /><circle cx="9" cy="10" r="1.6" />
                  <circle cx="3" cy="16" r="1.6" /><circle cx="9" cy="16" r="1.6" />
                </svg>
              </button>
              <button
                type="button"
                className="arrange-code"
                onClick={() => !solved && tap(index)}
                aria-pressed={selected === index}
                aria-label={`Line ${index + 1}: ${line.text.trim()}${selected === index ? ", selected" : ""}`}
                disabled={solved}
              >
                <code>{line.text}</code>
              </button>
              {mark !== undefined && <span className="arrange-mark">{mark ? "✓ Right place" : "✗ Not here"}</span>}
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
