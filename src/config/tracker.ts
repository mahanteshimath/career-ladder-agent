/**
 * Journey-aware Application / Program Tracker configuration.
 *
 * One board serves both journeys:
 *  - Job seekers:      Saved -> Applied -> Interview -> Offer -> Closed
 *  - Higher studies:   Shortlisted -> Emailed Prof -> Applied -> Interview -> Admitted -> Closed
 */

export type TrackerJourney = "job" | "academic";

export interface TrackerStage {
  id: string;
  label: string;
  /** Tailwind classes for the column header accent. */
  accent: string;
}

export const JOB_STAGES: TrackerStage[] = [
  { id: "saved", label: "Saved", accent: "text-slate-600 dark:text-slate-300" },
  { id: "applied", label: "Applied", accent: "text-blue-600 dark:text-blue-400" },
  { id: "interview", label: "Interview", accent: "text-amber-600 dark:text-amber-400" },
  { id: "offer", label: "Offer", accent: "text-emerald-600 dark:text-emerald-400" },
  { id: "closed", label: "Closed", accent: "text-rose-600 dark:text-rose-400" },
];

export const ACADEMIC_STAGES: TrackerStage[] = [
  { id: "saved", label: "Shortlisted", accent: "text-slate-600 dark:text-slate-300" },
  { id: "emailed", label: "Emailed Prof", accent: "text-violet-600 dark:text-violet-400" },
  { id: "applied", label: "Applied", accent: "text-blue-600 dark:text-blue-400" },
  { id: "interview", label: "Interview", accent: "text-amber-600 dark:text-amber-400" },
  { id: "admitted", label: "Admitted", accent: "text-emerald-600 dark:text-emerald-400" },
  { id: "closed", label: "Closed", accent: "text-rose-600 dark:text-rose-400" },
];

/** Every valid stage id across both journeys (used for API validation). */
export const ALL_STAGE_IDS = [
  "saved",
  "emailed",
  "applied",
  "interview",
  "offer",
  "admitted",
  "closed",
] as const;

export type TrackerStageId = (typeof ALL_STAGE_IDS)[number];

export function stagesForJourney(journey: TrackerJourney): TrackerStage[] {
  return journey === "academic" ? ACADEMIC_STAGES : JOB_STAGES;
}

/** Map an onboarding goal to the tracker journey. */
export function goalToJourney(goal: string | undefined | null): TrackerJourney {
  return goal === "masters" || goal === "phd" || goal === "postdoc" ? "academic" : "job";
}
