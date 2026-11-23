import { PdfResource } from "./PdfResource";
import type { FileLink } from "./files";

// Files and videos added to a lesson the original way, before lessons had
// blocks. Shared by the lesson page and the builder's preview, so the
// preview always matches what learners see.

function asFile(resource: FileLink | string): FileLink {
  return typeof resource === "string" ? { name: resource, url: resource } : resource;
}

function webLink(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^https?\/\//i.test(trimmed)) return trimmed.replace(/^https?/i, "https:");
  return `https://${trimmed}`;
}

export function LessonResources({
  slides = [],
  video,
  youtubeUrl,
}: {
  slides?: (FileLink | string)[];
  video?: FileLink | string;
  youtubeUrl?: string;
}) {
  return (
    <>
      {slides.length ? (
        <div className="lesson-resource">
          <b>Slides</b>
          {slides.map((slide) => {
            const file = asFile(slide);
            return <PdfResource file={file} key={file.url} />;
          })}
        </div>
      ) : null}
      {video ? (
        <div className="lesson-resource">
          <b>Short video preview</b>
          {typeof video === "string" ? (
            <a href={video} target="_blank" rel="noreferrer">
              Open preview clip
            </a>
          ) : (
            <video controls preload="metadata" src={video.url}>
              Your browser does not support video playback.
            </video>
          )}
        </div>
      ) : null}
      {youtubeUrl ? (
        <div className="lesson-resource">
          <b>Full lesson video</b>
          <a className="full-video-link" href={webLink(youtubeUrl)} target="_blank" rel="noreferrer">
            Watch the full video on YouTube
          </a>
        </div>
      ) : null}
    </>
  );
}
