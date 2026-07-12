/**
 * Deterministic, offline CV-to-opportunity fit scoring.
 *
 * Computes a 0-100 fit score from keyword overlap between a candidate's CV
 * keywords and an opportunity's text (title + description + requirements).
 * No LLM call — fast, free, and unit-testable. Used to surface inline fit
 * badges on browse lists without a per-item AI round-trip.
 */

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param cvKeywords Candidate keywords (from parsed CV).
 * @param text       Opportunity text to match against.
 * @returns Integer fit score in [0, 100]. Returns 0 when inputs are empty.
 */
export function computeFitScore(cvKeywords: string[] | undefined, text: string | undefined): number {
  if (!cvKeywords?.length || !text) return 0;

  const seen = new Set<string>();
  let matched = 0;

  for (const raw of cvKeywords) {
    const kw = raw?.trim().toLowerCase();
    if (!kw || kw.length < 2 || seen.has(kw)) continue;
    seen.add(kw);
    const re = new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i");
    if (re.test(text)) matched++;
  }

  // A strong match needs several overlapping keywords; cap the denominator so
  // keyword-rich CVs are not unfairly penalised.
  const denom = Math.min(Math.max(seen.size, 4), 10);
  const raw = (matched / denom) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export type FitBand = "strong" | "moderate" | "reach";

/** Bucket a fit score into a qualitative band for UI/shortlist grouping. */
export function fitBand(score: number): FitBand {
  if (score >= 70) return "strong";
  if (score >= 40) return "moderate";
  return "reach";
}
