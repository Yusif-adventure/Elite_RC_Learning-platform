import type { SyntheticEvent } from "react";

function svg(markup: string) {
  return `data:image/svg+xml,${encodeURIComponent(markup)}`;
}

// Shown when a course has no image or its image link no longer works.
export const COURSE_IMAGE_PLACEHOLDER = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250"><rect width="400" height="250" fill="#0b315f"/><path d="M150 140l100-30-20 20 40 5 10-10 5 15-15 5-40-5-20 25-10-5 10-25-55 15z" fill="#7091b3"/></svg>`,
);

// Shown when an instructor has no photo, instead of a stranger's stock photo.
export const PERSON_IMAGE_PLACEHOLDER = svg(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#d9e3ee"/><circle cx="50" cy="38" r="17" fill="#7091b3"/><path d="M18 92c4-20 18-30 32-30s28 10 32 30z" fill="#7091b3"/></svg>`,
);

export function showPlaceholderOnError(placeholder: string) {
  return (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    // Swap only once, so a failing placeholder cannot loop.
    if (image.dataset.placeholder) return;
    image.dataset.placeholder = "shown";
    image.src = placeholder;
  };
}

export function courseImageProps(src?: string) {
  return {
    src: src || COURSE_IMAGE_PLACEHOLDER,
    onError: showPlaceholderOnError(COURSE_IMAGE_PLACEHOLDER),
  };
}

export function personImageProps(src?: string) {
  return {
    src: src || PERSON_IMAGE_PLACEHOLDER,
    onError: showPlaceholderOnError(PERSON_IMAGE_PLACEHOLDER),
  };
}
