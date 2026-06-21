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
Given a candidate's profile (skills, education, experience), find REAL, CURRENT job listings that match their qualifications.

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
    "source_url": "URL to the job listing"
  }
]

Find at least 5-10 job listings. Only include jobs you are confident are real and currently open.
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
  customInstructions: string = ""
): Promise<JobResearchResult | { error: string }> {
  const promptParts = [
    `Candidate Profile:`,
    cvSummary,
  ];

  const instructions = customInstructions.trim().slice(0, 500);
  if (instructions) {
    promptParts.push("", `Custom instructions: ${instructions}`);
  }

  promptParts.push("", "Find matching job listings that are currently open.");

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
    const fallback = citationsAsJobs(result.citations);
    if (fallback.length > 0) {
      return { jobs: fallback, citations: result.citations };
    }
    return { error: "AI job search returned no valid job entries." };
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

function citationsAsJobs(citations: string[]): ResearchedJob[] {
  return citations
    .filter((url) => url && url.startsWith("http"))
    .slice(0, 10)
    .map((url, idx) => ({
      title: `Opportunity Source ${idx + 1}`,
      company: "Unknown",
      location: "",
      description: "Open the source link to view full role details.",
      requiredSkills: [],
      experienceLevel: "",
      salaryRange: "",
      sourceUrl: url.trim(),
    }));
}
