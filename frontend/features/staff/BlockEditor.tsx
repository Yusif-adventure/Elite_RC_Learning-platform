import { useState } from "react";
import {
  BLOCK_TYPES,
  MAX_ARRANGE_LINES,
  arrangeLines,
  blockProblem,
  moveItem,
  newBlock,
  type BlockType,
  type LessonBlock,
} from "../lesson/blocks";
import { LessonBlockView } from "../lesson/LessonBlocks";
import type { UploadKind } from "./courseApi";
import { Field, FileField, FileRow, RemoveButton } from "./formParts";
import type { CourseResource } from "./StaffPages";

const MEGABYTE = 1024 * 1024;

export type UploadFiles = (
  files: File[],
  kind: UploadKind,
  maxBytes: number,
  label: string,
) => Promise<CourseResource[] | null>;

const LABELS = Object.fromEntries(BLOCK_TYPES.map(({ type, label }) => [type, label])) as Record<BlockType, string>;

const TEXT_HINT =
  "# Heading, ## Smaller heading, - bullet, 1. numbered, > callout, **bold**, *italic*, `code`, [link](https://...), and ``` on its own line before and after a code block.";

// Removing a block that has anything in it asks first.
function blockHasContent(block: LessonBlock) {
  return Object.entries(block).some(([key, value]) => !["id", "type"].includes(key) && String(value ?? "").trim());
}

export function LessonBlocksEditor({
  blocks,
  onChange,
  showProblems,
  uploadFiles,
}: {
  blocks: LessonBlock[];
  onChange: (update: (blocks: LessonBlock[]) => LessonBlock[]) => void;
  showProblems: boolean;
  uploadFiles: UploadFiles;
}) {
  const update = (id: string, change: Partial<LessonBlock>) =>
    onChange((current) =>
      current.map((block) => (block.id === id ? ({ ...block, ...change } as LessonBlock) : block)),
    );
  const remove = (block: LessonBlock) => {
    if (blockHasContent(block) && !window.confirm(`Remove this ${LABELS[block.type].toLowerCase()} block?`)) return;
    onChange((current) => current.filter((item) => item.id !== block.id));
  };
  const move = (from: number, to: number) => onChange((current) => moveItem(current, from, to));

  return (
    <div className="block-editor">
      <div className="block-editor-head">
        <b>Lesson content</b>
        <small>
          Stack text, pictures, videos, PDFs and activities in the order learners should see them. Files and
          videos added below still show after these blocks.
        </small>
      </div>
      {blocks.map((block, index) => (
        <BlockCard
          key={block.id}
          block={block}
          number={index + 1}
          isFirst={index === 0}
          isLast={index === blocks.length - 1}
          showProblems={showProblems}
          onMove={(direction) => move(index, index + direction)}
          onRemove={() => remove(block)}
          onUpdate={(change) => update(block.id, change)}
          uploadFiles={uploadFiles}
        />
      ))}
      <div className="block-add" role="group" aria-label="Add a block to this lesson">
        <span className="field-name">Add a block</span>
        <div className="block-add-buttons">
          {BLOCK_TYPES.map(({ type, label, description }) => (
            <button
              type="button"
              key={type}
              className="block-add-button"
              onClick={() => onChange((current) => [...current, newBlock(type)])}
            >
              <b>+ {label}</b>
              <small>{description}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlockCard({
  block,
  number,
  isFirst,
  isLast,
  showProblems,
  onMove,
  onRemove,
  onUpdate,
  uploadFiles,
}: {
  block: LessonBlock;
  number: number;
  isFirst: boolean;
  isLast: boolean;
  showProblems: boolean;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onUpdate: (change: Partial<LessonBlock>) => void;
  uploadFiles: UploadFiles;
}) {
  const [previewing, setPreviewing] = useState(false);
  const problem = blockProblem(block);
  const canPreview = ["text", "html", "arrange"].includes(block.type) && !problem;
  const invalid = (bad: boolean) => (showProblems && bad ? "invalid" : undefined);

  return (
    <div className={`block-card${showProblems && problem ? " has-problem" : ""}`}>
      <div className="block-card-head">
        <span className="badge">
          {number}. {LABELS[block.type]}
        </span>
        <span className="block-card-tools">
          {canPreview && (
            <button type="button" className="block-tool" aria-pressed={previewing} onClick={() => setPreviewing((value) => !value)}>
              {previewing ? "Edit" : "Preview"}
            </button>
          )}
          <button type="button" className="block-tool" onClick={() => onMove(-1)} disabled={isFirst} aria-label={`Move block ${number} up`}>
            ↑
          </button>
          <button type="button" className="block-tool" onClick={() => onMove(1)} disabled={isLast} aria-label={`Move block ${number} down`}>
            ↓
          </button>
          <RemoveButton onClick={onRemove}>Remove</RemoveButton>
        </span>
      </div>

      {previewing && canPreview ? (
        <div className="block-preview">
          <LessonBlockView block={block} />
        </div>
      ) : (
        <>
          {block.type === "text" && (
            <Field label="Text" required hint={TEXT_HINT}>
              <textarea
                className={`block-textarea ${invalid(!block.text.trim()) ?? ""}`.trim()}
                rows={8}
                value={block.text}
                onChange={(event) => onUpdate({ text: event.target.value })}
                placeholder={"# Meet the Arduino\nIt's a tiny computer that loves blinking LEDs.\n\n```cpp\ndigitalWrite(13, HIGH);\n```"}
              />
            </Field>
          )}

          {block.type === "image" && (
            <>
              <FileField
                label="Picture"
                hint="PNG, JPG, WEBP or GIF, up to 10 MB"
                accept=".png,.jpg,.jpeg,.webp,.gif"
                replacing={Boolean(block.url)}
                onFiles={async (files) => {
                  const uploaded = await uploadFiles(files, "lesson-image", 10 * MEGABYTE, "Picture");
                  if (uploaded) onUpdate({ url: uploaded[0].url });
                }}
              >
                {block.url && <img className="block-image-preview" src={block.url} alt="" />}
              </FileField>
              <Field label="Describe the picture" required hint="Read out to learners who cannot see it.">
                <input
                  className={invalid(Boolean(block.url) && !block.alt.trim())}
                  value={block.alt}
                  maxLength={300}
                  onChange={(event) => onUpdate({ alt: event.target.value })}
                  placeholder="e.g. An Arduino Uno with an LED on pin 13"
                />
              </Field>
              <Field label="Caption">
                <input
                  value={block.caption ?? ""}
                  maxLength={300}
                  onChange={(event) => onUpdate({ caption: event.target.value || undefined })}
                />
              </Field>
            </>
          )}

          {block.type === "youtube" && (
            <>
              <Field label="YouTube link" required hint="The video plays inside the lesson.">
                <input
                  className={invalid(Boolean(problem))}
                  type="url"
                  value={block.url}
                  onChange={(event) => onUpdate({ url: event.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </Field>
              <Field label="Video title" hint="Read out by screen readers.">
                <input
                  value={block.title ?? ""}
                  maxLength={200}
                  onChange={(event) => onUpdate({ title: event.target.value || undefined })}
                />
              </Field>
              {!problem && <LessonBlockView block={block} />}
            </>
          )}

          {(block.type === "pdf" || block.type === "video") && (
            <FileField
              label={block.type === "pdf" ? "PDF" : "Video"}
              hint={block.type === "pdf" ? "PDF, up to 20 MB. Learners can read it on the page or download it." : "MP4 plays best, up to 50 MB"}
              accept={block.type === "pdf" ? ".pdf" : ".mp4,.webm,.mov"}
              replacing={Boolean(block.url)}
              onFiles={async (files) => {
                const uploaded =
                  block.type === "pdf"
                    ? await uploadFiles(files, "lesson-pdf", 20 * MEGABYTE, "PDF")
                    : await uploadFiles(files, "video", 50 * MEGABYTE, "Video");
                if (uploaded) onUpdate({ url: uploaded[0].url, name: uploaded[0].name });
              }}
            >
              {block.url && <FileRow file={{ name: block.name, url: block.url }} onRemove={() => onUpdate({ url: "", name: "" })} />}
            </FileField>
          )}

          {block.type === "html" && (
            <>
              <Field label="Title" hint="Read out by screen readers, e.g. LED colour mixer.">
                <input
                  value={block.title ?? ""}
                  maxLength={200}
                  onChange={(event) => onUpdate({ title: event.target.value || undefined })}
                />
              </Field>
              <Field
                label="HTML, CSS and JavaScript"
                required
                hint="Runs in a sealed-off frame: it can draw anything and react to clicks, but cannot reach the learner's account or the rest of the page."
              >
                <textarea
                  className={`block-textarea block-code ${invalid(!block.html.trim()) ?? ""}`.trim()}
                  rows={12}
                  spellCheck={false}
                  value={block.html}
                  onChange={(event) => onUpdate({ html: event.target.value })}
                  placeholder={'<style>button { font-size: 20px; }</style>\n<button onclick="this.textContent = \'Blink!\'">Press me</button>'}
                />
              </Field>
            </>
          )}

          {block.type === "arrange" && (
            <>
              <Field label="Title">
                <input
                  value={block.title ?? ""}
                  maxLength={200}
                  onChange={(event) => onUpdate({ title: event.target.value || undefined })}
                  placeholder="e.g. Fix the scrambled Blink sketch"
                />
              </Field>
              <Field label="Instructions" hint="Leave empty to use the standard instructions.">
                <input
                  value={block.instructions ?? ""}
                  maxLength={2000}
                  onChange={(event) => onUpdate({ instructions: event.target.value || undefined })}
                />
              </Field>
              <Field
                label="Code in the right order"
                required
                hint={`One line of code per line, 2 to ${MAX_ARRANGE_LINES} lines. Learners see them shuffled. Blank lines are left out; indentation stays as a clue.`}
              >
                <textarea
                  className={`block-textarea block-code ${invalid(Boolean(problem)) ?? ""}`.trim()}
                  rows={Math.min(Math.max(arrangeLines(block.code).length + 2, 6), 16)}
                  spellCheck={false}
                  value={block.code}
                  onChange={(event) => onUpdate({ code: event.target.value })}
                  placeholder={"void setup() {\n  pinMode(13, OUTPUT);\n}"}
                />
              </Field>
            </>
          )}
        </>
      )}
      {showProblems && problem && <p className="block-problem">{problem}</p>}
    </div>
  );
}
