/**
 * Maps a user's onboarding goal to the persona that drives the dashboard nav.
 *
 * Two journeys share one app:
 *  - Higher-studies applicants (masters / phd / postdoc) -> "student"
 *  - Industry job seekers (job) -> "job_seeker"
 *  - Undecided / exploring -> "explorer" (sees both journeys' nav items)
 */

export type NavPersona = "student" | "job_seeker" | "explorer";

/** Persona value persisted in the CL_USERS.PERSONA column. */
export type StoredPersona = "student" | "job_seeker" | "unset";

/**
 * Derive the nav persona from the onboarding goal.
 * Returns null when the goal is missing/unknown so callers can fall back.
 */
export function goalToNavPersona(goal: string | undefined | null): NavPersona | null {
  switch (goal) {
    case "job":
      return "job_seeker";
    case "masters":
    case "phd":
    case "postdoc":
      return "student";
    case "undecided":
      return "explorer";
    default:
      return null;
  }
}

/**
 * Derive the value to persist in the PERSONA column from the onboarding goal.
 * Undecided / unknown goals map to "unset".
 */
export function goalToStoredPersona(goal: string | undefined | null): StoredPersona {
  switch (goal) {
    case "job":
      return "job_seeker";
    case "masters":
    case "phd":
    case "postdoc":
      return "student";
    default:
      return "unset";
  }
}
