/**
 * POST /api/scholarships — Live AI scholarship/funding discovery via Perplexity.
 */

export const maxDuration = 60;

import { NextRequest } from "next/server";
import { z } from "zod";
import { orchestrate } from "@/lib/agents/orchestrator";
import { getCvById, getUserCvs } from "@/lib/snowflake/queries";
import { cvParser } from "@/lib/agents/cv-parser";
import { isPerplexityConfigured } from "@/lib/perplexity/config";
import { checkDailyCap, incrementDailyCap } from "@/lib/perplexity/daily-cap";
import { apiSuccess, badRequest, serverError, apiError, getAuthenticatedUser } from "@/lib/api-response";

const ScholarshipSchema = z.object({
  cvId: z.string().uuid().optional(),
  level: z.string().max(60).optional(),
  field: z.string().max(120).optional(),
  country: z.string().max(60).optional(),
});

/** Build a CV summary from a specific CV or the user's most recent one. */
async function buildCvSummary(userId: string, cvId?: string): Promise<string | null> {
  const row = cvId
    ? await getCvById(cvId, userId)
    : ((await getUserCvs(userId))?.[0] as { PARSED_JSON?: unknown } | undefined) ?? null;
  const parsedJson = (row as { PARSED_JSON?: unknown } | null)?.PARSED_JSON;
  if (!parsedJson) return null;
  const parsed = typeof parsedJson === "string" ? JSON.parse(parsedJson) : parsedJson;
  return cvParser.buildSummary(cvParser.normalize(parsed as Record<string, unknown>));
}

export async function POST(request: NextRequest) {
  const { userId, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  if (!isPerplexityConfigured()) {
    return apiError("SERVICE_UNAVAILABLE", "Scholarship search is not available. Perplexity API key is not configured.", 503);
  }

  const capCheck = await checkDailyCap();
  if (!capCheck.allowed) {
    return apiError("DAILY_CAP_REACHED", "Daily AI search limit reached. Please try again tomorrow.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = ScholarshipSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const cvSummary = await buildCvSummary(userId, parsed.data.cvId);
  if (!cvSummary) {
    return badRequest("Upload a CV first to get scholarships matched to your profile.");
  }

  const currentDate = new Date().toISOString().split("T")[0];

  try {
    const result = await orchestrate({
      task: "research_scholarships",
      userId,
      payload: {
        cvSummary,
        level: parsed.data.level || "",
        field: parsed.data.field || "",
        country: parsed.data.country || "",
        currentDate,
      },
    });

    if (!result.success) {
      return serverError((result.data as { error?: string })?.error || "Scholarship search failed. Try again later.");
    }

    await incrementDailyCap();

    return apiSuccess(result.data, 200, {
      cached: result.cached,
      processingTime: result.processingTime,
    });
  } catch (error) {
    console.error("Scholarship route error:", error);
    return serverError("An unexpected error occurred during scholarship search.");
  }
}
