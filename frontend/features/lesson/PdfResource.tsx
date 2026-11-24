import { useState } from "react";
import { downloadLink, inlinePdfLink, isPdf, type FileLink } from "./files";
import "./lesson.css";

// A lesson file. PDFs can be read on the page or downloaded; other files,
// such as PowerPoint slides, can only be downloaded.
export function PdfResource({
  file,
  label,
  startOpen = false,
}: {
  file: FileLink;
  label?: string;
  startOpen?: boolean;
}) {
  const pdf = isPdf(file);
  const [open, setOpen] = useState(pdf && startOpen);
  return (
    <div className="file-resource">
      <div className="file-resource-head">
        <span className="file-resource-name">
          {label && <b>{label}</b>}
          <span>{file.name}</span>
        </span>
        <span className="file-resource-actions">
          {pdf && (
            <button
              type="button"
              className="btn outline small"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <span>{open ? "Hide" : "View on page"}</span>
            </button>
          )}
          <a className="btn outline small" href={downloadLink(file)} download={file.name} target="_blank" rel="noreferrer">
            <span>Download</span>
          </a>
        </span>
      </div>
      {open && (
        <>
          <iframe className="file-resource-frame" src={inlinePdfLink(file.url)} title={file.name} loading="lazy" />
          <small className="file-resource-note">
            Not showing?{" "}
            <a href={file.url} target="_blank" rel="noreferrer">
              Open it in a new tab
            </a>
            . Some phone browsers can only show PDFs on their own.
          </small>
        </>
      )}
      {!pdf && <small className="file-resource-note">Download this file to open it.</small>}
    </div>
  );
}
