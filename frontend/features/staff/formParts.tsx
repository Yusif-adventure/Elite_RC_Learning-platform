import { useState, type DragEvent, type ReactNode } from "react";
import type { CourseResource } from "./StaffPages";
import { imageLinkProblem, imageLoads } from "./imageLink";

// Small pieces shared by the course builder and its quiz editor.

const ICONS = {
  up: "m6 15 6-6 6 6",
  down: "m6 9 6 6 6-6",
  upload: "M12 16V5m0 0L8 9m4-4 4 4M5 19h14",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5",
  close: "m6 6 12 12M18 6 6 18",
  check: "m5 13 4 4L19 7",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0",
  book: "M12 6.5C10.5 5 8 4.5 4 5v14c4-.5 6.5 0 8 1.5m0-14c1.5-1.5 4-2 8-1.5v14c-4-.5-6.5 0-8 1.5m0-14v14",
};

export function FormIcon({
  name,
  size = 18,
}: {
  name: keyof typeof ICONS;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

export function Field({
  label,
  required = false,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-name">
        {label}
        {required && <i aria-hidden="true"> *</i>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function RemoveButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="form-remove"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function FileField({
  label,
  hint,
  accept,
  multiple = false,
  replacing = false,
  onFiles,
  children,
}: {
  label: string;
  hint: string;
  accept: string;
  multiple?: boolean;
  replacing?: boolean;
  onFiles: (files: File[]) => Promise<void>;
  children?: ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const takeFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      await onFiles(multiple ? files : files.slice(0, 1));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    void takeFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div className="file-field">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="field-name">{label}</span>
        <input
          className="file-input"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            // Clearing the input lets staff pick the same file again after a failure.
            event.target.value = "";
            void takeFiles(files);
          }}
        />
        <span
          className={`file-drop${dragging ? " dragging" : ""}${uploading ? " uploading" : ""}`}
        >
          <span className="file-drop-icon">
            <FormIcon name="upload" />
          </span>
          <span>
            {uploading ? (
              "Uploading..."
            ) : (
              <>
                Drag {replacing ? "a new file" : multiple ? "files" : "a file"}{" "}
                here or <u>browse</u>
              </>
            )}
          </span>
          <small>{hint}</small>
        </span>
      </label>
      {children}
    </div>
  );
}

export function FileRow({
  file,
  onRemove,
}: {
  file: CourseResource;
  onRemove: () => void;
}) {
  return (
    <div className="file-row">
      <FormIcon name="file" />
      <a href={file.url} target="_blank" rel="noreferrer">
        {file.name}
      </a>
      <RemoveButton label={`Remove ${file.name}`} onClick={onRemove}>
        <FormIcon name="close" size={16} />
      </RemoveButton>
    </div>
  );
}

// Adds a picture by pasting its link, as an alternative to uploading. The
// link must be https and must load as a picture before it is used.
export function ImageLinkField({
  label = "Or paste an image link",
  onUse,
}: {
  label?: string;
  onUse: (url: string) => void;
}) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<{ checking: boolean; error: string }>({ checking: false, error: "" });

  const use = async () => {
    const link = value.trim();
    const problem = imageLinkProblem(link);
    if (problem) {
      setState({ checking: false, error: problem });
      return;
    }
    setState({ checking: true, error: "" });
    if (!(await imageLoads(link))) {
      setState({
        checking: false,
        error: "That link did not load as a picture. Check it opens an image on its own, or upload the file instead.",
      });
      return;
    }
    setState({ checking: false, error: "" });
    setValue("");
    onUse(link);
  };

  return (
    <div className="image-link-field">
      <span className="field-name">{label}</span>
      <div className="image-link-row">
        <input
          type="url"
          inputMode="url"
          value={value}
          className={state.error ? "invalid" : undefined}
          aria-invalid={Boolean(state.error)}
          aria-label={label}
          onChange={(event) => {
            setValue(event.target.value);
            setState({ checking: false, error: "" });
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void use();
            }
          }}
          placeholder="https://images.unsplash.com/..."
        />
        <button type="button" className="block-tool" disabled={state.checking || !value.trim()} onClick={() => void use()}>
          {state.checking ? "Checking..." : "Use link"}
        </button>
      </div>
      {state.error ? (
        <small className="image-link-error" role="alert">
          {state.error}
        </small>
      ) : (
        <small>Only use pictures you have permission to use. Linked pictures can disappear, so upload anything important.</small>
      )}
    </div>
  );
}
