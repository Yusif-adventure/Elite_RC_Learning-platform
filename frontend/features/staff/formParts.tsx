import type { ReactNode } from "react";

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
