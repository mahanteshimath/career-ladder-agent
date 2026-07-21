/**
 * Job Researcher Agent — discovers real job listings via Perplexity deep research.
 * Searches the live web for industry positions matching a candidate's profile.
 */

import { callPerplexity, isPerplexityError } from "@/lib/perplexity/client";
import { parseJsonResponse } from "@/lib/perplexity/json-utils";
import {
  classifySource,
  dedupe,
  dedupeAndClean,
  isReachable,
  PREFERRED_ATS_BOARDS,
  sourceRank,
  toDomain,
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
}

export interface JobResearchResult {
  jobs: ResearchedJob[];
  citations: string[];
}

const SYSTEM_PROMPT = `You are a job market research specialist.
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
    "source_url": "Direct URL to this exact job posting"
  }
]

Return up to 10 jobs, but ONLY ones that pass every rule above. It is fine to return fewer (even 3-4) highly-relevant, verified, open roles.
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

/**
 * Phase 3 — validate + rank: check every apply link is live, drop dead and
 * aggregator links, and sort real ATS/official + verified postings first.
 */
async function validateAndRankJobs(jobs: ResearchedJob[]): Promise<ResearchedJob[]> {
  const cleaned = dedupeAndClean(jobs).filter((j) => j.sourceUrl);

  await Promise.all(
    cleaned.map(async (j) => {
      j.verified = await isReachable(j.sourceUrl);
    })
  );

  // Keep links that are reachable, or that live on a known ATS / official
  // careers page (those often block HEAD requests but are still real).
  const kept = cleaned.filter((j) => {
    const cls = classifySource(j.sourceUrl);
    return j.verified || cls === "ats" || cls === "official";
  });

  return kept.sort((a, b) => sourceRank(b) - sourceRank(a));
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

  // Scope the deep search to real career/ATS domains: discovered company
  // domains first, then the top ATS boards, capped at Perplexity's 10-domain limit.
  const domainFilter = dedupe([...domains, ...PREFERRED_ATS_BOARDS]).slice(0, 10);

  const searchPrompt = [
    basePrompt,
    "",
    roles.length ? `Prioritise these roles: ${roles.slice(0, 6).join(", ")}.` : "",
    domains.length
      ? `Prefer official career pages on these domains: ${domains.slice(0, 8).join(", ")}.`
      : "",
    "Only return postings hosted on official company careers pages or ATS domains (Greenhouse, Lever, Workday, Ashby, SmartRecruiters, iCIMS). Never return aggregator or search-engine links.",
    "Every job MUST have a direct, currently-live apply URL on such a page — drop any job you cannot link directly.",
  ]
    .filter(Boolean)
    .join("\n");

  // Phase 2 — deep search restricted to real career/ATS domains.
  let result = await callPerplexity(SYSTEM_PROMPT, searchPrompt, {
    webSearchOptions: { search_context_size: "high" },
    searchDomainFilter: domainFilter,
    timeout: 60_000,
  });

  // If the domain-restricted search failed, retry once without the filter.
  if (isPerplexityError(result)) {
    result = await callPerplexity(SYSTEM_PROMPT, searchPrompt, {
      webSearchOptions: { search_context_size: "high" },
    });
    if (isPerplexityError(result)) return result;
  }

  // Parse JSON from response
  let parsed = parseJsonResponse(result.content);

  // JSON repair fallback
  if (!parsed) {
    const repair = await callPerplexity(
      JSON_REPAIR_PROMPT,
      `Convert the following content into a valid JSON array of job objects. Return ONLY JSON.\n\n${result.content}`,
      { temperature: 0.0 }
    );

    if (isPerplexityError(repair)) {
      return { error: "Failed to parse job results: AI returned invalid JSON and repair failed." };
    }

    parsed = parseJsonResponse(repair.content);
    if (!parsed) {
      return { error: "Failed to parse job results: AI returned invalid JSON." };
    }
  }

  // Normalize, then validate apply links and rank official/verified first.
  const normalized = normalizeJobs(parsed as Record<string, unknown>[]);
  const jobs = await validateAndRankJobs(normalized);

  if (jobs.length === 0) {
    return {
      error:
        "No open jobs with a verified apply link matched your location and target role. Try broadening the location or role keywords.",
    };
  }

  return { jobs, citations: result.citations };
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
