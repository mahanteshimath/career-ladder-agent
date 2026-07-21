/**
 * Job Researcher Agent — discovers real job listings via Perplexity deep research.
 * Searches the live web for industry positions matching a candidate's profile.
 */

import { callPerplexity, isPerplexityError } from "@/lib/perplexity/client";
import { parseJsonResponse } from "@/lib/perplexity/json-utils";
import { computeFitScore } from "@/lib/utils/fit-score";
import { TRUST_BOUNDARY } from "@/lib/agents/safety";
import {
  classifySource,
  dedupe,
  dedupeAndClean,
  PREFERRED_ATS_BOARDS,
  sourceRank,
  toDomain,
  verifyJobLink,
} from "@/lib/utils/job-sources";

export interface ResearchedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  requiredSkills: string[];
  experienceLevel: string;
  salaryRange: string;
  sourceUrl: string;
  /** True once the apply link has been reachability-checked. */
  verified?: boolean;
  /** Application deadline (YYYY-MM-DD) if the posting states one. */
  deadline?: string;
  /** 0-100 CV↔job fit from required-skill overlap; higher = more relevant. */
  fitScore?: number;
}

export interface JobResearchResult {
  jobs: ResearchedJob[];
  citations: string[];
}

const SYSTEM_PROMPT = `${TRUST_BOUNDARY}

You are a job market research specialist.
Given a candidate's profile and their stated preferences, find REAL, CURRENTLY-OPEN job listings.

RELEVANCE (treat the candidate's stated preferences as HARD filters):
- LOCATION: every job must be in the requested location (or explicitly remote if the candidate allows remote). Do not return jobs in other cities/countries.
- ROLE & SENIORITY: every job must match the requested role type and seniority (e.g. "Director, GenAI" → only director-level generative-AI roles, not unrelated or junior roles).
- Skip anything that does not clearly satisfy BOTH of the above. Fewer, highly-relevant results are better than many loose ones.

FRESHNESS (do not return stale postings):
- Only include roles that are CURRENTLY OPEN and accepting applications as of today's date.
- Prefer postings published within the last ~45 days. Exclude expired, filled, paused, or closed listings.

SOURCE URL (must match the job):
- "source_url" must be the EXACT live posting page for THAT specific job at THAT company — clicking it must show the same role.
- Prefer the official company careers page or the original ATS posting (Greenhouse, Lever, Workday, etc.) over aggregators.
- Do NOT return search-results/listing/aggregator pages or a search URL.
- If you cannot provide a verified, direct, currently-live URL for a job, DROP that job entirely — do not include it with a guessed or search URL.

DIVERSITY (spread across employers):
- Return roles from MANY DIFFERENT companies — at most 2 roles per company.
- Do not fill the list with one employer; aim for a variety of relevant companies.

Return ONLY valid JSON — an array of job objects:
[
  {
    "title": "Job title",
    "company": "Company name",
    "location": "City, Country",
    "description": "Job description (2-3 sentences)",
    "required_skills": ["skill1", "skill2"],
    "experience_level": "Entry/Mid/Senior",
    "salary_range": "If available, otherwise empty string",
    "posted_date": "Approx posting date YYYY-MM or 'recent' if unknown",
    "application_deadline": "Application deadline as YYYY-MM-DD if the posting states one, otherwise empty string",
    "source_url": "Direct URL to this exact job posting"
  }
]

Return 15-20 jobs across DIFFERENT companies, but ONLY ones that pass every rule above. It is fine to return fewer if too few genuinely match.
Return ONLY the JSON array, no markdown or explanation.`;

const JSON_REPAIR_PROMPT = `You are a strict JSON formatter.
Given raw model output, extract and return ONLY a valid JSON array of job objects.
Each object must have at minimum: "title", "company".
Return ONLY JSON, no explanations.`;

const DISCOVERY_PROMPT = `You are a recruiting research planner.
Given a candidate profile and their preferences, decide which REAL companies to target and WHERE their jobs are actually posted (official careers site or the ATS they use).

Return ONLY valid JSON:
{
  "roles": ["specific role titles to search for"],
  "companies": [
    { "name": "Company", "careerDomain": "their official careers domain or ATS domain, e.g. careers.acme.com, boards.greenhouse.io, acme.wd1.myworkdayjobs.com" }
  ]
}

Pick 6-10 real companies that actively hire this exact profile in the requested location.
Use their REAL official careers domain or the ATS they use (Greenhouse, Lever, Workday, Ashby, SmartRecruiters, iCIMS).
NEVER use aggregators (LinkedIn, Indeed, Google, Naukri, Glassdoor).
Return ONLY the JSON object.`;

/**
 * Phase 1 — agentic discovery: identify target companies + the official
 * career/ATS domains where their jobs actually live. Best-effort: on any
 * failure it returns empty and the main search proceeds without hints.
 */
async function discoverTargets(
  userPrompt: string
): Promise<{ roles: string[]; domains: string[] }> {
  const res = await callPerplexity(DISCOVERY_PROMPT, userPrompt, {
    webSearchOptions: { search_context_size: "low" },
    timeout: 30_000,
  });
  if (isPerplexityError(res)) return { roles: [], domains: [] };

  const parsed = parseJsonResponse(res.content);
  const obj = (parsed && parsed[0]) as Record<string, unknown> | undefined;
  if (!obj) return { roles: [], domains: [] };

  const roles = Array.isArray(obj.roles)
    ? (obj.roles as unknown[]).map((r) => String(r).trim()).filter(Boolean)
    : [];

  const domains: string[] = [];
  const companies = Array.isArray(obj.companies) ? (obj.companies as Record<string, unknown>[]) : [];
  for (const c of companies) {
    const host = toDomain(String(c.careerDomain || c.domain || c.url || ""));
    if (host) domains.push(host);
  }

  return { roles, domains: dedupe(domains) };
}

/** Parse a YYYY-MM-DD deadline and return true if it is strictly before `today` (YYYY-MM-DD). */
export function isDeadlinePassed(deadline: string | undefined, today: string): boolean {
  if (!deadline) return false;
  const m = deadline.trim().match(/\d{4}-\d{2}-\d{2}/);
  if (!m) return false; // non-date shapes (e.g. "Open until filled") are not expiry signals
  return m[0] < today;
}

/**
 * Phase 3 — validate + rank: check every apply link is live, drop dead,
 * aggregator, and past-deadline postings, then sort real ATS/official +
 * verified postings first and, within that, by CV↔job fit.
 */
async function validateAndRankJobs(
  jobs: ResearchedJob[],
  cvSummary: string,
  today: string
): Promise<ResearchedJob[]> {
  const cleaned = dedupeAndClean(jobs).filter((j) => j.sourceUrl);

  // Check each apply link's real liveness (not just HTTP reachability).
  const checked = await Promise.all(
    cleaned.map(async (j) => ({ job: j, status: await verifyJobLink(j.sourceUrl) }))
  );

  // Drop confirmed-dead links and postings whose application deadline has
  // passed. Keep live ones (green badge), plus links we couldn't judge that
  // still live on a known ATS / official careers page (often bot-blocked but real).
  const kept: ResearchedJob[] = [];
  for (const { job, status } of checked) {
    if (status === "dead") continue;
    if (isDeadlinePassed(job.deadline, today)) continue;
    job.verified = status === "live";
    job.fitScore = computeFitScore(job.requiredSkills, cvSummary);
    const cls = classifySource(job.sourceUrl);
    if (status === "live" || cls === "ats" || cls === "official") kept.push(job);
  }

  // Rank: live/official/verified first, then by CV↔job fit.
  const ranked = kept.sort(
    (a, b) => sourceRank(b) - sourceRank(a) || (b.fitScore ?? 0) - (a.fitScore ?? 0)
  );

  // Enforce employer diversity: no single company may dominate the list.
  // Keep the 3 best-ranked roles per company, then top up if we ended short.
  const perCompany = new Map<string, number>();
  const diverse: ResearchedJob[] = [];
  const overflow: ResearchedJob[] = [];
  for (const j of ranked) {
    const key = j.company.trim().toLowerCase();
    const count = perCompany.get(key) ?? 0;
    if (count < 3) {
      perCompany.set(key, count + 1);
      diverse.push(j);
    } else {
      overflow.push(j);
    }
  }
  return [...diverse, ...overflow];
}

/**
 * One deep-search pass: query Perplexity (optionally scoped to a domain list),
 * parse the JSON (with a repair fallback), and return normalized jobs.
 * Returns { jobs, citations }; jobs is [] on failure so callers can merge passes.
 */
async function runOneSearch(
  searchPrompt: string,
  domainFilter?: string[]
): Promise<{ jobs: ResearchedJob[]; citations: string[] }> {
  let result = await callPerplexity(SYSTEM_PROMPT, searchPrompt, {
    webSearchOptions: { search_context_size: "high" },
    ...(domainFilter && domainFilter.length ? { searchDomainFilter: domainFilter } : {}),
    timeout: 60_000,
  });

  // If a domain-restricted search failed, retry once without the filter.
  if (isPerplexityError(result) && domainFilter && domainFilter.length) {
    result = await callPerplexity(SYSTEM_PROMPT, searchPrompt, {
      webSearchOptions: { search_context_size: "high" },
      timeout: 60_000,
    });
  }
  if (isPerplexityError(result)) return { jobs: [], citations: [] };

  let parsed = parseJsonResponse(result.content);

  // JSON repair fallback.
  if (!parsed) {
    const repair = await callPerplexity(
      JSON_REPAIR_PROMPT,
      `Convert the following content into a valid JSON array of job objects. Return ONLY JSON.\n\n${result.content}`,
      { temperature: 0.0 }
    );
    if (isPerplexityError(repair)) return { jobs: [], citations: result.citations };
    parsed = parseJsonResponse(repair.content);
  }
  if (!parsed) return { jobs: [], citations: result.citations };

  return {
    jobs: normalizeJobs(parsed as Record<string, unknown>[]),
    citations: result.citations,
  };
}

/**
 * Search for job listings matching a candidate's profile.
 *
 * @param cvSummary - Condensed CV text (name, skills, experience, education)
 * @param customInstructions - Optional user constraints (e.g. "remote only", "in Bangalore")
 * @param currentDate - ISO date for freshness context
 */
export async function searchJobs(
  cvSummary: string,
  customInstructions: string = "",
  currentDate: string = ""
): Promise<JobResearchResult | { error: string }> {
  const promptParts: string[] = [];

  if (currentDate) {
    promptParts.push(`Today's date: ${currentDate}`, "");
  }

  promptParts.push(`Candidate Profile:`, cvSummary);

  const instructions = customInstructions.trim().slice(0, 500);
  if (instructions) {
    promptParts.push(
      "",
      `Candidate preferences (HARD filters — location and target role must match):`,
      instructions
    );
  }

  const basePrompt = promptParts.join("\n");

  // Phase 1 — agentic discovery of target companies + official domains.
  const { roles, domains } = await discoverTargets(basePrompt);

  const searchPrompt = [
    basePrompt,
    "",
    roles.length ? `Prioritise these roles: ${roles.slice(0, 6).join(", ")}.` : "",
    domains.length
      ? `Prefer official career pages on these domains: ${domains.slice(0, 8).join(", ")}.`
      : "",
    "Only return postings hosted on official company careers pages or ATS domains (Greenhouse, Lever, Workday, Ashby, SmartRecruiters, iCIMS). Never return aggregator or search-engine links.",
    "Every job MUST have a direct, currently-live apply URL on such a page — drop any job you cannot link directly.",
    "Return roles from MANY DIFFERENT companies — at most 3 per company. Cover a wide variety of employers.",
  ]
    .filter(Boolean)
    .join("\n");

  // Phase 2 — two parallel deep searches to widen coverage:
  //  (A) scoped to the discovered company career domains,
  //  (B) scoped to the top ATS boards.
  // Merging both yields more real, diverse postings than a single 10-domain pass.
  const companyFilter = dedupe(domains).slice(0, 10);
  const atsFilter = dedupe([...PREFERRED_ATS_BOARDS, ...domains]).slice(0, 10);

  const passes = await Promise.all([
    runOneSearch(searchPrompt, companyFilter.length ? companyFilter : atsFilter),
    runOneSearch(searchPrompt, atsFilter),
  ]);

  const rawJobs = passes.flatMap((p) => p.jobs);
  const citations = dedupe(passes.flatMap((p) => p.citations));

  if (rawJobs.length === 0) {
    return {
      error: "Job search failed: the AI research service did not return results. Please try again.",
    };
  }

  // Validate apply links and rank official/verified first (dedupes across passes).
  const jobs = await validateAndRankJobs(
    rawJobs,
    cvSummary,
    (currentDate || new Date().toISOString()).slice(0, 10)
  );

  if (jobs.length === 0) {
    return {
      error:
        "No open jobs with a verified apply link matched your location and target role. Try broadening the location or role keywords.",
    };
  }

  return { jobs, citations };
}

function normalizeJobs(items: Record<string, unknown>[]): ResearchedJob[] {
  const normalized: ResearchedJob[] = [];

  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;

    const title = pickFirst(item, ["title", "job_title", "role", "position"]);
    const company = pickFirst(item, ["company", "employer", "organization"]) || "Unknown";

    if (!title) continue;

    // Handle required_skills as string or array
    let requiredSkills: string[] = [];
    const rawSkills = item.required_skills || item.skills || item.technologies;
    if (Array.isArray(rawSkills)) {
      requiredSkills = rawSkills
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean);
    } else if (typeof rawSkills === "string") {
      requiredSkills = rawSkills.split(",").map((s) => s.trim()).filter(Boolean);
    }

    normalized.push({
      title,
      company,
      location: pickFirst(item, ["location", "city", "country", "work_location"]),
      description: pickFirst(item, ["description", "summary", "job_description"]),
      requiredSkills,
      experienceLevel: pickFirst(item, ["experience_level", "seniority", "level"]),
      salaryRange: pickFirst(item, ["salary_range", "salary", "compensation"]),
      sourceUrl: pickFirst(item, ["source_url", "url", "link", "apply_url"]),
      deadline: pickFirst(item, ["application_deadline", "deadline", "apply_by", "closing_date"]),
    });
  }

  return normalized;
}

function pickFirst(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}
