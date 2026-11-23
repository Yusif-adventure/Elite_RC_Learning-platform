// Checks for a picture added by pasting its link instead of uploading it.

// What is wrong with a pasted image link before trying to load it, or "".
export function imageLinkProblem(value: string): string {
  const link = value.trim();
  if (!link) return "Paste a link to a picture.";
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return "That is not a full web link. It should start with https://";
  }
  if (url.protocol !== "https:") {
    return "Use a secure link that starts with https://. Browsers block http pictures on this site.";
  }
  // A link copied from Unsplash's address bar is the photo's page, not the picture.
  if (/(^|\.)unsplash\.com$/i.test(url.hostname) && url.hostname !== "images.unsplash.com") {
    return "That is the Unsplash page, not the picture. Open the photo, right-click it and choose Copy image address, then paste that here.";
  }
  return "";
}

// Whether the link loads as a picture. Gives up after `timeoutMs`.
export function imageLoads(link: string, timeoutMs = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => finish(false), timeoutMs);
    function finish(ok: boolean) {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(ok);
    }
    image.onload = () => finish(image.naturalWidth > 0);
    image.onerror = () => finish(false);
    image.referrerPolicy = "no-referrer";
    image.src = link;
  });
}
