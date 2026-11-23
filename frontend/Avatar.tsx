import { useState } from "react";
import "./avatar.css";

// An account's photo, or its initials when it has none or the photo fails to load.
export function Avatar({ photo, initials }: { photo?: string; initials: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (photo && failed !== photo) {
    return (
      <img
        className="avatar-photo"
        src={photo}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(photo)}
      />
    );
  }
  return <>{initials}</>;
}
