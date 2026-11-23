import { useState } from "react";
import {
  BLOCK_TYPES,
  MAX_ARRANGE_LINES,
  arrangeLines,
  blockFromTemplate,
  blockProblem,
  fillTemplate,
  moveItem,
  newBlock,
  templateChanged,
  templateFields,
  type BlockTemplate,
  type BlockType,
  type LessonBlock,
  type TemplateField,
} from "../lesson/blocks";
import { LessonBlockView } from "../lesson/LessonBlocks";
import type { TemplateInput, UploadKind } from "./courseApi";
import { Field, FileField, FileRow, RemoveButton } from "./formParts";
import type { CourseResource } from "./StaffPages";

const MEGABYTE = 1024 * 1024;

export type UploadFiles = (
  files: File[],
  kind: UploadKind,
  maxBytes: number,
  label: string,
) => Promise<CourseResource[] | null>;

// The shared template library, loaded once by the course builder.
export type TemplateLibrary = {
  list: BlockTemplate[];
  error: string;
  save: (template: TemplateInput, id?: string) => Promise<BlockTemplate>;
  remove: (template: BlockTemplate) => Promise<void>;
};

const LABELS = {
  ...Object.fromEntries(BLOCK_TYPES.map(({ type, label }) => [type, label])),
  template: "Template",
} as Record<BlockType, string>;

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
  templates,
}: {
  blocks: LessonBlock[];
  onChange: (update: (blocks: LessonBlock[]) => LessonBlock[]) => void;
  showProblems: boolean;
  uploadFiles: UploadFiles;
  templates: TemplateLibrary;
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
  const replace = (id: string, block: LessonBlock) =>
    onChange((current) => current.map((item) => (item.id === id ? block : item)));
  const removeTemplate = async (template: BlockTemplate) => {
    if (!window.confirm(`Delete the "${template.name}" template? Lessons that already use it keep their copy.`)) return;
    try {
      await templates.remove(template);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "The template could not be deleted.");
    }
  };

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
          onReplace={(next) => replace(block.id, next)}
          uploadFiles={uploadFiles}
          templates={templates}
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
        <span className="field-name">From your templates</span>
        {templates.error ? (
          <small className="block-problem">{templates.error}</small>
        ) : templates.list.length ? (
          <div className="block-add-buttons">
            {templates.list.map((template) => (
              <div className="block-template-chip" key={template.id}>
                <button
                  type="button"
                  className="block-add-button"
                  onClick={() => onChange((current) => [...current, blockFromTemplate(template)])}
                >
                  <b>+ {template.name}</b>
                  <small>
                    {template.description ||
                      `${template.fields.length} ${template.fields.length === 1 ? "thing" : "things"} to fill in`}
                  </small>
                </button>
                <button
                  type="button"
                  className="block-tool"
                  aria-label={`Delete the ${template.name} template`}
                  onClick={() => void removeTemplate(template)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <small className="block-hint">
            None yet. Write an HTML block with {"{{placeholders}}"} for the parts that change, then choose Save as
            template.
          </small>
        )}
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
  onReplace,
  uploadFiles,
  templates,
}: {
  block: LessonBlock;
  number: number;
  isFirst: boolean;
  isLast: boolean;
  showProblems: boolean;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onUpdate: (change: Partial<LessonBlock>) => void;
  onReplace: (block: LessonBlock) => void;
  uploadFiles: UploadFiles;
  templates: TemplateLibrary;
}) {
  const [previewing, setPreviewing] = useState(false);
  const problem = blockProblem(block);
  const canPreview = ["text", "html", "arrange", "template"].includes(block.type) && !problem;
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
              <TemplateSaver html={block.html} title={block.title} templates={templates} />
            </>
          )}

          {block.type === "template" && (
            <TemplateBlockFields
              block={block}
              latest={templates.list.find((template) => template.id === block.templateId)}
              onUpdate={onUpdate}
              onReplace={onReplace}
            />
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

type TemplateBlock = Extract<LessonBlock, { type: "template" }>;

function TemplateBlockFields({
  block,
  latest,
  onUpdate,
  onReplace,
}: {
  block: TemplateBlock;
  latest?: BlockTemplate;
  onUpdate: (change: Partial<LessonBlock>) => void;
  onReplace: (block: LessonBlock) => void;
}) {
  const useLatest = () => {
    if (!latest) return;
    // Values for fields the new version still has are kept.
    onUpdate({
      templateName: latest.name,
      html: latest.html,
      fields: latest.fields,
      values: Object.fromEntries(latest.fields.map(({ key }) => [key, block.values[key] ?? ""])),
    });
  };
  const editCode = () => {
    if (!window.confirm("Turn this into an HTML block with your answers filled in? It will no longer follow the template.")) return;
    onReplace({
      id: block.id,
      type: "html",
      title: block.templateName,
      html: fillTemplate(block.html, block.fields, block.values),
    });
  };
  return (
    <>
      <p className="block-hint">
        From the template <b>{block.templateName}</b>. Changing the template later does not change this lesson
        until you choose to update it.
      </p>
      {block.fields.length === 0 && <p className="block-hint">This template has nothing to fill in.</p>}
      {block.fields.map((field) => (
        <Field label={field.label} key={field.key}>
          <textarea
            rows={2}
            maxLength={5000}
            value={block.values[field.key] ?? ""}
            onChange={(event) => onUpdate({ values: { ...block.values, [field.key]: event.target.value } })}
          />
        </Field>
      ))}
      <div className="block-card-tools">
        {latest && templateChanged(block, latest) && (
          <button type="button" className="block-tool" onClick={useLatest}>
            Use the latest version of the template
          </button>
        )}
        <button type="button" className="block-tool" onClick={editCode}>
          Edit the code
        </button>
      </div>
    </>
  );
}

// Saves an HTML block as a reusable template. Each {{placeholder}} in the
// HTML becomes something to fill in when the template is used.
function TemplateSaver({
  html,
  title,
  templates,
}: {
  html: string;
  title?: string;
  templates: TemplateLibrary;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(title ?? "");
  const [description, setDescription] = useState("");
  const [labels, setLabels] = useState<TemplateField[]>([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const fields = templateFields(html, labels);
  const existing = templates.list.find(
    (template) => template.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );

  if (templates.error) return null;
  if (!open) {
    return (
      <button
        type="button"
        className="form-add"
        disabled={!html.trim()}
        onClick={() => {
          setOpen(true);
          setStatus("");
        }}
      >
        Save as template
      </button>
    );
  }

  const save = async () => {
    if (!name.trim()) {
      setStatus("Give the template a name.");
      return;
    }
    if (
      existing &&
      !window.confirm(`Replace the "${existing.name}" template with this code? Lessons that already use it keep their copy.`)
    ) {
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      await templates.save({ name: name.trim(), description: description.trim(), html, fields }, existing?.id);
      setStatus(`Saved. "${name.trim()}" is now under From your templates in every lesson.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The template could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="template-saver">
      <b>Save as a reusable template</b>
      <small className="block-hint">
        Put {"{{name}}"} in the HTML for each part that changes, like {"{{question}}"}. Each one becomes a box to
        fill in. Inside a script, read the value from BLOCK_DATA.name instead.
      </small>
      <Field label="Template name" required>
        <input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="e.g. Flip card" />
      </Field>
      <Field label="Description">
        <input
          value={description}
          maxLength={500}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="e.g. A card that flips to show the answer"
        />
      </Field>
      {fields.length ? (
        fields.map((field) => (
          <Field label={`Label for {{${field.key}}}`} key={field.key}>
            <input
              value={field.label}
              maxLength={80}
              onChange={(event) => {
                const label = event.target.value;
                setLabels((current) => [...current.filter((item) => item.key !== field.key), { key: field.key, label }]);
              }}
            />
          </Field>
        ))
      ) : (
        <small className="block-hint">No {"{{placeholders}}"} found, so the template will have nothing to fill in.</small>
      )}
      <div className="block-card-tools">
        <button type="button" className="btn primary" onClick={() => void save()} disabled={saving}>
          <span>{saving ? "Saving..." : existing ? "Replace template" : "Save template"}</span>
        </button>
        <button type="button" className="block-tool" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      {status && (
        <p className="block-hint" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
