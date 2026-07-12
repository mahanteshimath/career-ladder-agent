/**
 * Lab Researcher Agent — compiles lab/department insights for an academic
 * position to help PhD/Postdoc applicants evaluate a lab: QS ranking,
 * research output, lab environment, ethical practice, and alumni destinations.
 *
 * Uses Perplexity live web research. Falls back gracefully when the API is
 * unavailable, and never fabricates — unknown fields are "Not available".
 */

import { callPerplexity, isPerplexityError } from "@/lib/perplexity/client";
import { isPerplexityConfigured } from "@/lib/perplexity/config";
import { parseJsonResponse } from "@/lib/perplexity/json-utils";

export interface LabInsights {
  university: string;
  department: string;
  summary: string;
  qsRanking: string;
  researchOutput: string;
  labEnvironment: string;
  ethicalPractice: string;
  alumniDestinations: string;
  notableFaculty: string[];
  citations: string[];
}

const SYSTEM_PROMPT = `You are an academic research analyst helping PhD and Postdoc applicants evaluate a lab or department before applying.

Given a university, department, and (optionally) a professor or research field, research REAL, CURRENT public information and return ONLY valid JSON:
{
  "summary": "2-3 sentence overview of the lab/department and its focus",
  "qsRanking": "QS World University Ranking of the institution and, if available, the subject ranking for this department",
  "researchOutput": "Notable recent research output: key papers, active research areas, grants/funding",
  "labEnvironment": "Lab/group culture, size, facilities, and working environment if publicly known",
  "ethicalPractice": "Any public information on research ethics, student wellbeing, or integrity practices",
  "alumniDestinations": "Where graduates/postdocs from this lab or department typically go (academia or industry)",
  "notableFaculty": ["key professors relevant to this field"]
}

RULES:
- Base every field ONLY on real, verifiable public information.
- If a detail is not available, use "Not available" (or an empty array for notableFaculty). NEVER fabricate rankings, names, or statistics.
- Return ONLY the JSON object, no markdown or explanation.`;

export async function researchLab(
  university: string,
  department: string,
  field?: string
): Promise<LabInsights> {
  if (!university || university.trim().length === 0) {
    return fallbackInsights(university, department);
  }

  if (!isPerplexityConfigured()) {
    return fallbackInsights(university, department);
  }

  const userPrompt = [
    `University: ${university}`,
    department ? `Department: ${department}` : "",
    field ? `Research field / position focus: ${field}` : "",
    "",
    "Compile the lab/department insights as specified.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await callPerplexity(SYSTEM_PROMPT, userPrompt, {
    webSearchOptions: { search_context_size: "high" },
    temperature: 0.1,
  });

  if (isPerplexityError(result)) {
    console.error("[lab-researcher] Perplexity error:", result.error);
    return fallbackInsights(university, department);
  }

  const parsed = parseJsonResponse(result.content);
  if (parsed && parsed.length > 0 && typeof parsed[0] === "object" && parsed[0] !== null) {
    return normalizeLabInsights(
      parsed[0] as Record<string, unknown>,
      university,
      department,
      result.citations
    );
  }

  return fallbackInsights(university, department);
}

/**
 * Coerce a raw AI object into a safe, fully-typed LabInsights.
 * Exported for unit testing.
 */
export function normalizeLabInsights(
  raw: Record<string, unknown>,
  university: string,
  department: string,
  citations: string[] = []
): LabInsights {
  const str = (v: unknown, fallback = "Not available"): string => {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
    return fallback;
  };

  const faculty = Array.isArray(raw.notableFaculty)
    ? raw.notableFaculty.map((f) => String(f)).filter((f) => f.trim().length > 0)
    : [];

  const cites = Array.isArray(citations)
    ? citations.map((c) => String(c)).filter((c) => c.trim().length > 0)
    : [];

  return {
    university,
    department,
    summary: str(raw.summary),
    qsRanking: str(raw.qsRanking),
    researchOutput: str(raw.researchOutput),
    labEnvironment: str(raw.labEnvironment),
    ethicalPractice: str(raw.ethicalPractice),
    alumniDestinations: str(raw.alumniDestinations),
    notableFaculty: faculty,
    citations: cites,
  };
}

/**
 * Placeholder insights returned when research is unavailable.
 * Exported for unit testing.
 */
export function fallbackInsights(university: string, department: string): LabInsights {
  return {
    university: university || "Unknown",
    department: department || "",
    summary: "Lab insights are currently unavailable. Please try again later.",
    qsRanking: "Not available",
    researchOutput: "Not available",
    labEnvironment: "Not available",
    ethicalPractice: "Not available",
    alumniDestinations: "Not available",
    notableFaculty: [],
    citations: [],
  };
}
