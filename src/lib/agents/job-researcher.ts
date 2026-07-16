/**
 * Job Researcher Agent — discovers real job listings via Perplexity deep research.
 * Searches the live web for industry positions matching a candidate's profile.
 */

import { callPerplexity, isPerplexityError } from "@/lib/perplexity/client";
import { parseJsonResponse } from "@/lib/perplexity/json-utils";

export interface ResearchedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  requiredSkills: string[];
  experienceLevel: string;
  salaryRange: string;
  sourceUrl: string;
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

/**
 * Search for job listings matching a candidate's profile.
 *
 * @param cvSummary - Condensed CV text (name, skills, experience, education)
 * @param customInstructions - Optional user constraints (e.g. "remote only", "in Bangalore")
 */
export async function searchJobs(
  cvSummary: string,
  customInstructions: string = "",
  currentDate: string = ""
): Promise<JobResearchResult | { error: string }> {
  const promptParts = [];

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

  promptParts.push(
    "",
    "Return only jobs that are currently open, recently posted, match the candidate's location and target role, and have a verified direct posting URL."
  );

  const userPrompt = promptParts.join("\n");

  const result = await callPerplexity(SYSTEM_PROMPT, userPrompt, {
    webSearchOptions: { search_context_size: "high" },
  });

  if (isPerplexityError(result)) {
    return result;
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

  // Normalize
  const jobs = normalizeJobs(parsed as Record<string, unknown>[]);

  if (jobs.length === 0) {
    // Deliberately no citation fallback: generic "source" entries are not real
    // matches and were the source of irrelevant results. Prefer an honest empty.
    return {
      error:
        "No open jobs matched your location and target role. Try broadening the location or role keywords.",
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
