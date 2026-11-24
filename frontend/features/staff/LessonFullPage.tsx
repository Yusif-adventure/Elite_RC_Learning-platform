import { useEffect, useRef, useState, type ReactNode } from "react";

// One lesson, edited across the whole screen. Edits go straight into the
// course form, so closing keeps them; the course still needs saving.
// Preview shows the lesson as learners will see it, like a "preview before
// posting" step.
export function LessonFullPage({
  label,
  title,
  editor,
  preview,
  onClose,
}: {
  label: string;
  title: string;
  editor: ReactNode;
  preview: ReactNode;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The page behind stays still while this is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector(".dialog-backdrop")) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Each switch starts at the top, with focus on the heading.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [mode]);

  return (
    <div className="lesson-fullpage" role="dialog" aria-modal="true" aria-labelledby="lesson-fullpage-title">
      <header className="lesson-fullpage-bar">
        <button type="button" className="lesson-fullpage-back" onClick={onClose}>
          ← Back to course
        </button>
        <div className="lesson-fullpage-name">
          <small>{label}</small>
          <h2 id="lesson-fullpage-title" ref={headingRef} tabIndex={-1}>
            {title.trim() || "Untitled lesson"}
          </h2>
        </div>
        <div className="lesson-fullpage-modes" role="group" aria-label="Edit or preview">
          <button type="button" aria-pressed={mode === "edit"} onClick={() => setMode("edit")}>
            Edit
          </button>
          <button type="button" aria-pressed={mode === "preview"} onClick={() => setMode("preview")}>
            Preview
          </button>
        </div>
      </header>

      <div className="lesson-fullpage-scroll" ref={scrollRef}>
        {mode === "edit" ? (
          <div className="course-form lesson-fullpage-editor">
            {editor}
            <div className="lesson-fullpage-end">
              <p>Happy with it? See it the way learners will.</p>
              <button type="button" className="btn primary" onClick={() => setMode("preview")}>
                <span>Preview lesson →</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="lesson-fullpage-preview">
            <p className="lesson-fullpage-banner" role="note">
              <b>Preview.</b> This is what learners see after pressing Start lesson. Nothing is saved until you
              save the course.
            </p>
            {preview}
            <div className="lesson-fullpage-end">
              <button type="button" className="btn outline" onClick={() => setMode("edit")}>
                <span>← Keep editing</span>
              </button>
              <button type="button" className="btn primary" onClick={onClose}>
                <span>Done</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
