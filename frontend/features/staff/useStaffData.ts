import { useCallback, useEffect, useState } from "react";
import type { Member, StaffProgressRow } from "../../staffStats";
import { fetchMembers, fetchStaffCourses, fetchStaffProgress } from "./courseApi";
import type { StaffCourse } from "./StaffPages";

export type StaffDataStatus = "idle" | "loading" | "ready" | "error";

export type StaffData = {
  status: StaffDataStatus;
  courses: StaffCourse[];
  members: Member[];
  progress: StaffProgressRow[];
  // Courses are required; without them the staff pages cannot work.
  error: string;
  // Members or progress failing only hides some numbers, so it is a note.
  notes: string[];
};

const EMPTY: StaffData = { status: "idle", courses: [], members: [], progress: [], error: "", notes: [] };

const reasonText = (reason: unknown) =>
  reason instanceof Error && reason.message ? reason.message : "Please try again.";

// Loads the staff workspace's data while `enabled`, and again after reload().
export function useStaffData(enabled: boolean) {
  const [data, setData] = useState<StaffData>(EMPTY);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    // A refresh keeps showing the current numbers instead of a loading screen.
    setData((current) => (current.status === "ready" ? current : { ...current, status: "loading" }));
    Promise.allSettled([fetchStaffCourses(), fetchMembers(), fetchStaffProgress()]).then(
      ([courses, members, progress]) => {
        if (!active) return;
        if (courses.status === "rejected") {
          setData((current) => ({ ...current, status: "error", error: reasonText(courses.reason) }));
          return;
        }
        const notes = [
          ...(members.status === "rejected"
            ? [`Members could not be loaded. ${reasonText(members.reason)}`]
            : []),
          // The backend already explains progress problems in full.
          ...(progress.status === "rejected" ? [reasonText(progress.reason)] : []),
        ];
        setData({
          status: "ready",
          courses: courses.value,
          members: members.status === "fulfilled" ? members.value : [],
          progress: progress.status === "fulfilled" ? progress.value : [],
          error: "",
          notes,
        });
      },
    );
    return () => {
      active = false;
    };
  }, [enabled, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  return { ...data, reload, setData };
}
