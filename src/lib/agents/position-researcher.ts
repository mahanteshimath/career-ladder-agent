/**
 * Position Researcher Agent — discovers real academic positions via Perplexity deep research.
 * Searches the live web for PhD, Postdoc, Masters, and Research Assistant openings.
 */

import { callPerplexity, isPerplexityError, type PerplexityResult } from "@/lib/perplexity/client";
import { parseJsonResponse } from "@/lib/perplexity/json-utils";

export interface ResearchedPosition {
  title: string;
  university: string;
  country: string;
  continent: string;
  positionType: string;
  deadline: string;
  description: string;
  requirements: string;
  professorName: string;
  professorEmail: string;
  sourceUrl: string;
}

export interface PositionResearchResult {
  positions: ResearchedPosition[];
  citations: string[];
}

const SYSTEM_PROMPT = `You are a university position research specialist.
Given a candidate's profile and search criteria, find REAL, CURRENT university positions (Masters, PhD, Postdoc, or Research Assistant) that match their background.

Search for positions that:
1. Match the requested position type
2. Are in the specified continent/region
3. Have application deadlines that are still open (current date context provided)
4. Align with the candidate's research interests, skills, and education

Return ONLY valid JSON — an array of position objects:
[
  {
    "title": "Position title",
    "university": "University name",
    "country": "Country",
    "continent": "Continent",
    "position_type": "PhD/Postdoc/Masters/Research Assistant",
    "deadline": "YYYY-MM-DD or 'Open until filled'",
    "description": "Position description (2-3 sentences)",
    "requirements": "Key requirements",
    "professor_name": "Supervisor name if available",
    "professor_email": "Contact email if available",
    "source_url": "URL to the position listing"
  }
]

Find at least 5-10 positions. Only include positions you are confident are real.

CRITICAL — "source_url" rules:
- Provide the DIRECT link to THAT specific position posting (the page describing exactly this role at this university/lab).
- Do NOT return search-results or listing/aggregator pages or a Google search URL — these point to the wrong position.
- If you do not have the exact posting URL, return an empty string "" for source_url — never a search page or a guess.

Return ONLY the JSON array, no markdown or explanation.`;

const JSON_REPAIR_PROMPT = `You are a strict JSON formatter.
Given raw model output, extract and return ONLY a valid JSON array of position objects.
Each object must have at minimum: "title", "university".
Return ONLY JSON, no explanations.`;

/**
 * Search for academic positions matching a candidate's profile.
 */
export async function searchPositions(
  cvSummary: string,
  positionType: string,
  continent: string,
  currentDate: string
): Promise<PositionResearchResult | { error: string }> {
  const userPrompt = [
    `Today's date: ${currentDate}`,
    "",
    `Candidate Profile:`,
    cvSummary,
    "",
    `Search Criteria:`,
    `- Position Type: ${positionType}`,
    `- Region: ${continent}`,
    `- Only positions with open application deadlines`,
    "",
    `Find matching university positions.`,
  ].join("\n");

  const result = await callPerplexity(SYSTEM_PROMPT, userPrompt, {
    webSearchOptions: { search_context_size: "high" },
  });

  if (isPerplexityError(result)) {
    return result;
  }

  // Parse JSON from response
  let parsed = parseJsonResponse(result.content);

  // If parsing fails, try JSON repair via a second Perplexity call
  if (!parsed) {
    const repair = await callPerplexity(
      JSON_REPAIR_PROMPT,
      `Convert the following content into a valid JSON array of position objects. Return ONLY JSON.\n\n${result.content}`,
      { temperature: 0.0 }
    );

    if (isPerplexityError(repair)) {
      return { error: "Failed to parse position results: AI returned invalid JSON and repair failed." };
    }

    parsed = parseJsonResponse(repair.content);
    if (!parsed) {
      return { error: "Failed to parse position results: AI returned invalid JSON." };
    }
  }

  // Normalize position objects
  const positions = normalizePositions(parsed as Record<string, unknown>[]);

  if (positions.length === 0) {
    // Last resort: return citation URLs as minimal cards
    const fallback = citationsAsPositions(result.citations);
    if (fallback.length > 0) {
      return { positions: fallback, citations: result.citations };
    }
    return { error: "AI position search returned no valid position entries." };
  }

  return { positions, citations: result.citations };
}

function normalizePositions(items: Record<string, unknown>[]): ResearchedPosition[] {
  const normalized: ResearchedPosition[] = [];

  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;

    const title = pickFirst(item, ["title", "position_title", "role"]);
    const university = pickFirst(item, ["university", "institution", "organization"]) || "Unknown";

    if (!title) continue;

    normalized.push({
      title,
      university,
      country: pickFirst(item, ["country", "nation"]),
      continent: pickFirst(item, ["continent", "region"]),
      positionType: pickFirst(item, ["position_type", "type", "program_type"]),
      deadline: pickFirst(item, ["deadline", "application_deadline"]),
      description: pickFirst(item, ["description", "summary"]),
      requirements: pickFirst(item, ["requirements", "eligibility"]),
      professorName: pickFirst(item, ["professor_name", "supervisor", "advisor"]),
      professorEmail: pickFirst(item, ["professor_email", "contact_email", "email"]),
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

function citationsAsPositions(citations: string[]): ResearchedPosition[] {
  return citations
    .filter((url) => url && url.startsWith("http"))
    .slice(0, 10)
    .map((url, idx) => ({
      title: `Position Source ${idx + 1}`,
      university: "Unknown",
      country: "",
      continent: "",
      positionType: "",
      deadline: "",
      description: "Open the source link to view full position details.",
      requirements: "",
      professorName: "",
      professorEmail: "",
      sourceUrl: url.trim(),
    }));
}
