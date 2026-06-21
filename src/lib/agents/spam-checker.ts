import { callPerplexity, isPerplexityError } from "@/lib/perplexity/client";
import { parseJsonResponse } from "@/lib/perplexity/json-utils";

export interface SpamCheckResult {
  score: number; // 0 (legitimate) to 10 (spam)
  reason: string;
  recommendation: "approve" | "pending" | "reject";
}

/**
 * Spam checker agent — evaluates job post legitimacy using Perplexity.
 * Score < 3: auto-approve | Score > 7: auto-reject | 3-7: pending review
 */
export async function checkJobPostSpam(post: {
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  posterEmail: string;
}): Promise<SpamCheckResult> {
  const systemPrompt = `You are a job post spam detector for a career services platform. Evaluate job posts for legitimacy.

Evaluate based on:
1. Is the job title realistic and specific?
2. Is the company name legitimate (not random characters)?
3. Is the description professional and detailed enough?
4. Does the apply URL look legitimate (not suspicious domains)?
5. Does the poster email match a real organization?
6. Does it contain spam signals (excessive salary claims, urgency, poor grammar)?
7. Is it trying to collect personal data rather than being a real job?

Return your assessment as JSON:
{
  "score": <0-10 where 0=legitimate, 10=obvious spam>,
  "reason": "brief explanation of your assessment",
  "recommendation": "approve" | "pending" | "reject"
}

Rules for recommendation:
- score < 3: "approve"
- score > 7: "reject"
- score 3-7: "pending"

Return ONLY valid JSON.`;

  const userPrompt = `JOB POST:
Title: ${post.title}
Company: ${post.company}
Location: ${post.location}
Description: ${post.description.slice(0, 2000)}
Apply URL: ${post.applyUrl}
Poster Email: ${post.posterEmail}

Evaluate this post:`;

  const result = await callPerplexity(systemPrompt, userPrompt, {
    model: "sonar",
    temperature: 0,
    timeout: 30_000,
  });

  if (isPerplexityError(result)) {
    // Default to pending manual review if AI fails
    return { score: 5, reason: "AI assessment unavailable. Flagged for manual review.", recommendation: "pending" };
  }

  try {
    const parsed = parseJsonResponse(result.content);
    if (!parsed || parsed.length === 0) throw new Error("No JSON found");
    const assessment = parsed[0] as SpamCheckResult;
    return {
      score: Math.max(0, Math.min(10, assessment.score)),
      reason: assessment.reason || "Assessment complete",
      recommendation: assessment.recommendation || (assessment.score < 3 ? "approve" : assessment.score > 7 ? "reject" : "pending"),
    };
  } catch {
    return { score: 5, reason: "Unable to auto-assess. Flagged for manual review.", recommendation: "pending" };
  }
}
