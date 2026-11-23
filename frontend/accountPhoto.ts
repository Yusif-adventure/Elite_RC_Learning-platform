// The photo for an account: one uploaded on the profile page
// (user_metadata.avatar_url), or the one a sign-in provider such as Google
// supplies (picture). Only https links are used, because members can write
// anything into their own user_metadata.
type WithMetadata = { user_metadata?: Record<string, unknown> | null } | null | undefined;

export function accountPhoto(user: WithMetadata): string | undefined {
  const metadata = user?.user_metadata ?? {};
  for (const value of [metadata.avatar_url, metadata.picture]) {
    if (typeof value !== "string") continue;
    try {
      if (new URL(value).protocol === "https:") return value;
    } catch {
      // Not a link; try the next one.
    }
  }
  return undefined;
}
