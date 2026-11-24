// Helpers for files attached to lessons.

export type FileLink = { name: string; url: string };

const STORAGE_PATH = "/storage/v1/object/public/";

export function isPdf(file: FileLink) {
  const path = (() => {
    try {
      return new URL(file.url).pathname;
    } catch {
      return file.url;
    }
  })();
  return /\.pdf$/i.test(file.name) || /\.pdf$/i.test(path);
}

// Browsers ignore the download attribute for files on another site, so files
// in Supabase storage ask Supabase to send them as a download instead.
export function downloadLink(file: FileLink) {
  try {
    const url = new URL(file.url);
    if (!url.pathname.includes(STORAGE_PATH)) return file.url;
    url.searchParams.set("download", file.name);
    return url.toString();
  } catch {
    return file.url;
  }
}

// The link for showing a PDF on the page: the viewer's side panel of page
// thumbnails starts closed (navpanes for Chrome and Edge, pagemode for
// Firefox) and the page fits the width. Downloads use the plain link.
export function inlinePdfLink(url: string) {
  const [base] = url.split("#");
  return `${base}#navpanes=0&pagemode=none&view=FitH`;
}
