/**
 * Interview Coach Agent — generates tailored interview questions with
 * suggested talking points and preparation tips from a candidate's CV and a
 * target role or academic program. Uses Perplexity; never fabricates facts
 * about the candidate.
 */

import { callPerplexity, isPerplexityError } from "@/lib/perplexity/client";

export interface InterviewQuestion {
  question: string;
  category: string;
  suggestedPoints: string[];
}

export interface InterviewPrep {
  questions: InterviewQuestion[];
  tips: string[];
}

function systemPrompt(journey: "job" | "academic"): string {
  const context =
    journey === "academic"
      ? "a graduate-school / research-position admissions interview (PhD, Postdoc, or Masters)"
      : "a job interview for an industry role";
  return `You are an expert interview coach preparing a candidate for ${context}.
Given the candidate's CV summary and the target role/program, generate realistic interview questions and preparation guidance.

Return ONLY valid JSON with this structure:
{
  "questions": [
    {
      "question": "The interview question",
      "category": "behavioral | technical | motivation | research | role-specific",
      "suggestedPoints": ["2-4 concise talking points the candidate could use, grounded in their CV"]
    }
  ],
  "tips": ["3-5 short, specific preparation tips for this candidate and target"]
}

Rules:
- Generate 8-12 questions across a mix of categories.
- If APPLICATION MATERIALS are provided (the exact posting/program and the document the candidate actually submitted), tailor questions to THAT specific posting and probe the claims and gaps in what they wrote — not generic questions.
- Ground suggestedPoints in the candidate's actual background. Frame them as STAR cues (Situation → Task → Action → Result) drawn from real experience. Do NOT invent achievements, publications, or employers.
- For a requirement the candidate does not clearly meet, include an honest "bridge" talking point that frames adjacent experience — never fabricate the missing skill.
- Keep everything concise and practical.
- Return ONLY the JSON object, no markdown or explanation.`;
}

export async function generateInterviewPrep(
  cvSummary: string,
  targetContext: string,
  journey: "job" | "academic"
): Promise<InterviewPrep> {
  const userPrompt = `CANDIDATE PROFILE:
${cvSummary}

TARGET ROLE / PROGRAM:
${targetContext || "General preparation (no specific target provided)."}

Generate the interview preparation JSON now:`;

  const result = await callPerplexity(systemPrompt(journey), userPrompt, {
    model: "sonar",
    temperature: 0.5,
    timeout: 60_000,
  });

  if (isPerplexityError(result)) {
    throw new Error(`Interview prep generation failed: ${result.error}`);
  }

  const parsed = parseInterviewObject(result.content);

  const questions = normalizeQuestions(parsed?.questions);
  if (questions.length === 0) {
    throw new Error("Interview prep returned no valid questions.");
  }
  const tips = Array.isArray(parsed?.tips)
    ? (parsed!.tips as unknown[]).map(String).filter(Boolean).slice(0, 8)
    : [];

  return { questions, tips };
}

/** Parse a JSON object (with optional markdown fences) into { questions, tips }. */
function parseInterviewObject(raw: string): { questions?: unknown; tips?: unknown } | null {
  const text = (raw || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as { questions?: unknown; tips?: unknown };
  } catch {
    return null;
  }
}

function normalizeQuestions(raw: unknown): InterviewQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: InterviewQuestion[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const q = item as Record<string, unknown>;
    const question = typeof q.question === "string" ? q.question.trim() : "";
    if (!question) continue;
    out.push({
      question,
      category: typeof q.category === "string" && q.category.trim() ? q.category.trim() : "general",
      suggestedPoints: Array.isArray(q.suggestedPoints)
        ? (q.suggestedPoints as unknown[]).map(String).filter(Boolean).slice(0, 5)
        : [],
    });
  }
  return out;
}
