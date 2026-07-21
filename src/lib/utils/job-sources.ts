/**
 * Job source classification + apply-link validation.
 *
 * Purpose: prefer REAL company career pages / ATS postings over aggregators
 * and search engines, and drop dead apply links before showing jobs — so the
 * "Apply" button always lands on a live, official posting.
 */

export type SourceClass = "ats" | "official" | "aggregator" | "other";

// Applicant Tracking Systems / official job-hosting domains — real apply pages live here.
export const ATS_DOMAINS = [
  "greenhouse.io",
  "boards.greenhouse.io",
  "lever.co",
  "jobs.lever.co",
  "myworkdayjobs.com",
  "workday.com",
  "ashbyhq.com",
  "jobs.ashbyhq.com",
  "smartrecruiters.com",
  "icims.com",
  "workable.com",
  "teamtailor.com",
  "recruitee.com",
  "eightfold.ai",
  "jobvite.com",
  "successfactors.com",
  "taleo.net",
  "bamboohr.com",
];

// Aggregators / search engines — links here are often stale, gated, or generic.
export const AGGREGATOR_DOMAINS = [
  "google.com",
  "bing.com",
  "duckduckgo.com",
  "indeed.com",
  "linkedin.com",
  "glassdoor.com",
  "naukri.com",
  "monster.com",
  "ziprecruiter.com",
  "simplyhired.com",
  "shine.com",
  "foundit.in",
  "timesjobs.com",
];

/** Top ATS boards we always keep in the search scope as a fallback. */
export const PREFERRED_ATS_BOARDS = [
  "boards.greenhouse.io",
  "jobs.lever.co",
  "myworkdayjobs.com",
  "jobs.ashbyhq.com",
  "smartrecruiters.com",
];

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith("." + domain);
}

/**
 * Classify an apply URL by where it lives.
 * - "ats": a known Applicant Tracking System (real, apply-able)
 * - "official": a company's own careers/jobs page
 * - "aggregator": a job board / search engine (often stale or gated)
 * - "other": everything else
 */
export function classifySource(url: string): SourceClass {
  const host = hostOf(url);
  if (!host) return "other";
  if (AGGREGATOR_DOMAINS.some((d) => hostMatches(host, d))) return "aggregator";
  if (ATS_DOMAINS.some((d) => hostMatches(host, d))) return "ats";

  let path = "";
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    path = "";
  }

  if (
    host.startsWith("careers.") ||
    host.startsWith("career.") ||
    host.startsWith("jobs.") ||
    host.startsWith("job.") ||
    /\/(careers?|jobs?|vacancies|openings|opportunities)(\/|$|\?|#)/.test(path)
  ) {
    return "official";
  }
  return "other";
}

/** Extract a bare hostname from a possibly-messy domain/url string. */
export function toDomain(s: string): string {
  if (!s) return "";
  let host = s.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
  host = host.split("/")[0].split("?")[0];
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) ? host : "";
}

export function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export interface RankableJob {
  sourceUrl?: string;
  verified?: boolean;
  title?: string;
  company?: string;
}

/** Score a job so ATS/official + verified links sort to the top. */
export function sourceRank(job: RankableJob): number {
  const cls = job.sourceUrl ? classifySource(job.sourceUrl) : "other";
  const clsScore = cls === "ats" ? 2 : cls === "official" ? 1 : 0;
  return (job.verified ? 4 : 0) + clsScore;
}

/** Dedupe jobs by URL (or title+company) and drop aggregator links. */
export function dedupeAndClean<T extends RankableJob>(jobs: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const j of jobs) {
    const key = (j.sourceUrl || `${j.title}|${j.company}`).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (j.sourceUrl && classifySource(j.sourceUrl) === "aggregator") continue;
    out.push(j);
  }
  return out;
}

/** HEAD (then GET) reachability check with a timeout. Returns true if 2xx/3xx. */
export async function isReachable(url: string, timeoutMs = 6000): Promise<boolean> {
  const attempt = async (method: "HEAD" | "GET"): Promise<number> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method, redirect: "follow", signal: controller.signal });
      return res.status;
    } finally {
      clearTimeout(timer);
    }
  };
  try {
    let status = await attempt("HEAD");
    // Some sites reject HEAD or bot requests — retry once with GET.
    if ([403, 405, 501, 0].includes(status)) status = await attempt("GET");
    return status >= 200 && status < 400;
  } catch {
    return false;
  }
}

/** Liveness of a job posting: live, confirmed-dead, or can't-tell. */
export type LinkStatus = "live" | "dead" | "unknown";

/**
 * Phrases that appear on expired / filled / removed job postings.
 * Specific enough to avoid false positives on real, open descriptions.
 */
export const DEAD_POSTING_PATTERNS = [
  "no longer accepting application",
  "no longer accepting new application",
  "we are no longer accepting",
  "not accepting applications",
  "no longer available",
  "no longer open",
  "position has been filled",
  "this position is closed",
  "position is no longer",
  "role is no longer",
  "this job is no longer",
  "job is no longer available",
  "job posting is closed",
  "posting has closed",
  "posting has expired",
  "job has expired",
  "requisition is closed",
  "opportunity is no longer",
  "vacancy is closed",
  "job you are looking for", // Greenhouse 404: "The job you are looking for is no longer open."
  "page not found",
  "job not found",
  "404 not found",
];

/** True if the page body reads like an expired/removed posting. */
export function bodyLooksDead(text: string): boolean {
  const t = text.toLowerCase();
  return DEAD_POSTING_PATTERNS.some((p) => t.includes(p));
}

function pathDepth(url: string): number {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).length;
  } catch {
    return 0;
  }
}

/**
 * True if a specific job URL was redirected to a generic listing/board root —
 * a common signal that the posting expired (e.g. Greenhouse/Lever bounce
 * expired jobs to the company's board root).
 */
export function redirectedAway(originalUrl: string, finalUrl: string): boolean {
  if (!finalUrl || originalUrl === finalUrl) return false;
  const origHost = hostOf(originalUrl);
  const finalHost = hostOf(finalUrl);
  // Different host => treat as away only if it landed on an aggregator/search.
  if (origHost && finalHost && origHost !== finalHost) {
    return classifySource(finalUrl) === "aggregator";
  }
  // Same host: a deep job URL that collapsed to the board root/listing is stale.
  return pathDepth(originalUrl) >= 2 && pathDepth(finalUrl) <= 1;
}

/**
 * Verify a job link is a LIVE posting (not just HTTP-reachable):
 *  - "dead": 404/410, redirected to a generic board, or body says it's closed
 *  - "live": 2xx and body has no dead-posting signals
 *  - "unknown": blocked (401/403), server error, or fetch failed — can't tell
 *
 * ponytail: no headless browser, so client-rendered SPA ATS pages (e.g. some
 * Workday postings) that render "unavailable" via JS can't be detected here;
 * upgrade path is a headless fetch if false-positives remain a problem.
 */
export async function verifyJobLink(url: string, timeoutMs = 8000): Promise<LinkStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });

    if (res.status === 404 || res.status === 410) return "dead";
    // Auth-gated / rate-limited / server errors — can't judge; don't drop.
    if (res.status < 200 || res.status >= 400) return "unknown";

    if (redirectedAway(url, res.url || url)) return "dead";

    const body = (await res.text()).slice(0, 80_000);
    if (bodyLooksDead(body)) return "dead";
    return "live";
  } catch {
    return "unknown";
  } finally {
    clearTimeout(timer);
  }
}
