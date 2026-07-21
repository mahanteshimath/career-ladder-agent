/**
 * freehire.dev source — a free, no-key structured jobs API used as a SECOND
 * live-jobs source alongside Perplexity deep search. Results are real, indexed
 * postings with direct ATS apply links, so they flow through the same
 * verify → dedupe → rank pipeline in job-researcher.
 *
 * Base URL is swappable via FREEHIRE_API_URL for a self-hosted instance.
 * Every failure degrades to [] so this source can never break the main search.
 */

import type { ResearchedJob } from "./job-researcher";

const DEFAULT_BASE_URL = "https://freehire.dev";

function baseUrl(): string {
  return ((process.env.FREEHIRE_API_URL ?? "").trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

interface FreehireJob {
  url: string;
  title: string;
  company?: string;
  location?: string;
  description?: string;
  skills?: string[];
  countries?: string[];
  cities?: string[];
  closed_at?: string | null;
  enrichment?: {
    seniority?: string;
    salary_min?: number;
    salary_max?: number;
    salary_currency?: string;
  };
}

/** Strip freehire description HTML into short readable prose. */
function cleanHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function salaryOf(e: FreehireJob["enrichment"]): string {
  if (!e || (e.salary_min == null && e.salary_max == null)) return "";
  const cur = e.salary_currency ? `${e.salary_currency} ` : "";
  if (e.salary_min != null && e.salary_max != null) return `${cur}${e.salary_min}-${e.salary_max}`;
  return `${cur}${e.salary_min ?? e.salary_max}`;
}

/** Reshape freehire jobs into our ResearchedJob contract (pure; testable). */
export function mapFreehireJobs(raw: FreehireJob[]): ResearchedJob[] {
  const out: ResearchedJob[] = [];
  for (const j of raw) {
    if (!j || !j.url || !j.title || j.closed_at) continue; // skip closed / malformed
    out.push({
      title: j.title,
      company: j.company || "Unknown",
      location: j.location || j.cities?.[0] || j.countries?.[0] || "",
      description: cleanHtml(j.description).slice(0, 600),
      requiredSkills: (j.skills ?? []).map((s) => s.replace(/-/g, " ")).slice(0, 12),
      experienceLevel: j.enrichment?.seniority ?? "",
      salaryRange: salaryOf(j.enrichment),
      sourceUrl: j.url,
    });
  }
  return out;
}

/**
 * Keep only freehire jobs matching a location the user asked for. Extracts
 * capitalized place-like tokens from the free-text preferences; if none are
 * found (e.g. no location given), keeps everything.
 *
 * ponytail: a capitalized-token heuristic, not a geocoder — a stray capitalized
 * non-place word just fails to match and is harmless (jobs match on ANY token).
 */
const NON_PLACE_TOKENS = new Set([
  "data", "leadership", "role", "roles", "senior", "lead", "remote", "full",
  "time", "engineer", "manager", "director", "scientist", "analyst", "hybrid",
  "onsite", "junior", "mid", "principal", "staff", "team", "work",
]);

export function filterByLocationHint(jobs: ResearchedJob[], preferences: string): ResearchedJob[] {
  const tokens = (preferences.match(/\b[A-Z][a-zA-Z]{3,}\b/g) ?? [])
    .map((t) => t.toLowerCase())
    .filter((t) => !NON_PLACE_TOKENS.has(t));
  if (tokens.length === 0) return jobs;
  return jobs.filter((j) => {
    const loc = (j.location || "").toLowerCase();
    return tokens.some((t) => loc.includes(t));
  });
}

/**
 * Query freehire for real, currently-indexed jobs. Returns [] on any failure
 * (unreachable, non-2xx, or unparseable) so it never breaks the caller.
 */
export async function searchFreehire(
  query: string,
  opts: { limit?: number; postedWithinDays?: number } = {}
): Promise<ResearchedJob[]> {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    q,
    limit: String(opts.limit ?? 20),
    offset: "0",
    semantic_ratio: "0", // keyword search
  });
  if (opts.postedWithinDays) params.set("posted_within_days", String(opts.postedWithinDays));

  const url = `${baseUrl()}/api/v1/jobs/search?${params.toString()}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "career-ladder-agent/1.0", Accept: "application/json" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const body = (await res.json().catch(() => null)) as { data?: FreehireJob[] } | null;
    return mapFreehireJobs(body?.data ?? []);
  } catch {
    return [];
  }
}
