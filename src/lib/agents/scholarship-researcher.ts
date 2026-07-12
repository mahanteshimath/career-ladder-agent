/**
 * Scholarship Researcher Agent — discovers real, current scholarships and
 * funding opportunities via Perplexity live web research. Never fabricates:
 * unknown fields are returned empty and only confidently-real awards are kept.
 */

import { callPerplexity, isPerplexityError } from "@/lib/perplexity/client";
import { parseJsonResponse } from "@/lib/perplexity/json-utils";

export interface ResearchedScholarship {
  name: string;
  provider: string;
  country: string;
  level: string;
  amount: string;
  eligibility: string;
  deadline: string;
  sourceUrl: string;
}

export interface ScholarshipResearchResult {
  scholarships: ResearchedScholarship[];
  citations: string[];
}

const SYSTEM_PROMPT = `You are a scholarship research specialist for students applying to study abroad or in India.
Given a candidate profile and criteria, find REAL, CURRENT scholarships/funding (government, university, or private).

Only include scholarships that:
1. Match the requested study level and field
2. Are open to the candidate's nationality/region where relevant
3. Have application windows that are current or clearly recurring
4. Are verifiable from an official source

Return ONLY valid JSON — an array of scholarship objects:
[
  {
    "name": "Scholarship name",
    "provider": "Funding body / university / government",
    "country": "Country or 'Global'",
    "level": "Masters/PhD/Postdoc/Undergraduate",
    "amount": "Funding amount or coverage (e.g. 'Full tuition + stipend')",
    "eligibility": "Key eligibility in 1-2 sentences",
    "deadline": "YYYY-MM-DD or 'Recurring/Varies'",
    "source_url": "Official URL"
  }
]

Find 5-10 scholarships. Only include ones you are confident are real. Do NOT invent amounts or deadlines — use "Varies" if unsure.
Return ONLY the JSON array, no markdown or explanation.`;

const JSON_REPAIR_PROMPT = `You are a strict JSON formatter.
Given raw model output, extract and return ONLY a valid JSON array of scholarship objects.
Each object must have at minimum: "name", "provider".
Return ONLY JSON, no explanations.`;

export async function searchScholarships(
  cvSummary: string,
  level: string,
  field: string,
  country: string,
  currentDate: string
): Promise<ScholarshipResearchResult | { error: string }> {
  const userPrompt = [
    `Today's date: ${currentDate}`,
    "",
    "Candidate Profile:",
    cvSummary,
    "",
    "Search Criteria:",
    `- Study level: ${level || "Any"}`,
    `- Field: ${field || "Any"}`,
    `- Preferred country/region: ${country || "Any"}`,
    "",
    "Find matching scholarships and funding opportunities.",
  ].join("\n");

  const result = await callPerplexity(SYSTEM_PROMPT, userPrompt, {
    webSearchOptions: { search_context_size: "high" },
  });

  if (isPerplexityError(result)) {
    return result;
  }

  let parsed = parseJsonResponse(result.content);
  if (!parsed) {
    const repair = await callPerplexity(
      JSON_REPAIR_PROMPT,
      `Convert the following into a valid JSON array of scholarship objects. Return ONLY JSON.\n\n${result.content}`,
      { temperature: 0.0 }
    );
    if (isPerplexityError(repair)) {
      return { error: "Failed to parse scholarship results: AI returned invalid JSON and repair failed." };
    }
    parsed = parseJsonResponse(repair.content);
    if (!parsed) {
      return { error: "Failed to parse scholarship results: AI returned invalid JSON." };
    }
  }

  const scholarships = normalizeScholarships(parsed as Record<string, unknown>[]);
  if (scholarships.length === 0) {
    return { error: "AI scholarship search returned no valid entries." };
  }

  return { scholarships, citations: result.citations };
}

function pickFirst(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function normalizeScholarships(items: Record<string, unknown>[]): ResearchedScholarship[] {
  if (!Array.isArray(items)) return [];
  const out: ResearchedScholarship[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const name = pickFirst(item, ["name", "scholarship", "title"]);
    const provider = pickFirst(item, ["provider", "funding_body", "organization", "university"]);
    if (!name) continue;
    out.push({
      name,
      provider: provider || "Unknown",
      country: pickFirst(item, ["country", "region"]) || "Global",
      level: pickFirst(item, ["level", "study_level", "degree"]) || "Any",
      amount: pickFirst(item, ["amount", "funding", "coverage", "value"]) || "Varies",
      eligibility: pickFirst(item, ["eligibility", "requirements", "criteria"]),
      deadline: pickFirst(item, ["deadline", "application_deadline", "closing_date"]) || "Varies",
      sourceUrl: pickFirst(item, ["source_url", "url", "link"]),
    });
  }
  return out;
}
