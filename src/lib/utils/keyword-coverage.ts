/**
 * Deterministic ATS keyword coverage — no LLM.
 *
 * Extracts the known skills that a job description mentions (from the app's
 * keyword taxonomy) and checks which of them appear in the candidate's CV.
 * Surfaces literal keyword gaps the way an ATS parser sees them, so the user
 * can add missing terms they genuinely have (never keyword-stuff).
 */

import keywords from "@/config/keywords.json";

type Domain = { skills?: string[] };

/** Flatten every domain's skill list into one unique taxonomy of real skill terms. */
function collectTaxonomySkills(): string[] {
  const out = new Set<string>();
  const domains = (keywords as { domains?: Record<string, Domain> }).domains ?? {};
  for (const d of Object.values(domains)) {
    for (const s of d.skills ?? []) {
      const t = s.trim();
      // ponytail: drop 1-char terms (e.g. "R") to avoid matching stray letters;
      // ambiguous common-word skills like "Go" can still yield rare false hits.
      if (t.length >= 2) out.add(t);
    }
  }
  return [...out];
}

const TAXONOMY_SKILLS = collectTaxonomySkills();

/** Whole-token, case-insensitive presence test that tolerates skill punctuation (C++, Node.js, CI/CD). */
function hasTerm(text: string, term: string): boolean {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![a-z0-9])${esc}(?![a-z0-9])`, "i");
  return re.test(text);
}

export interface KeywordCoverage {
  /** % of the JD's detected skill keywords that also appear in the CV. */
  coveragePct: number;
  /** JD keywords present in the CV. */
  matched: string[];
  /** JD keywords absent from the CV (gaps to add only if truthful). */
  missing: string[];
  /** How many known skill keywords the JD mentioned. */
  jdKeywordCount: number;
}

const EMPTY: KeywordCoverage = { coveragePct: 0, matched: [], missing: [], jdKeywordCount: 0 };

/** Compute how well a CV covers the skill keywords a job description asks for. */
export function keywordCoverage(
  cvText: string | undefined,
  jdText: string | undefined
): KeywordCoverage {
  if (!cvText || !jdText) return EMPTY;

  const jdKeywords = TAXONOMY_SKILLS.filter((s) => hasTerm(jdText, s));
  if (jdKeywords.length === 0) return EMPTY;

  const matched: string[] = [];
  const missing: string[] = [];
  for (const kw of jdKeywords) {
    (hasTerm(cvText, kw) ? matched : missing).push(kw);
  }

  return {
    coveragePct: Math.round((matched.length / jdKeywords.length) * 100),
    matched,
    missing,
    jdKeywordCount: jdKeywords.length,
  };
}

/** Extract the known skills a CV/text mentions, in taxonomy order (for search steering). */
export function extractSkills(text: string | undefined, limit = 8): string[] {
  if (!text) return [];
  return TAXONOMY_SKILLS.filter((s) => hasTerm(text, s)).slice(0, limit);
}
