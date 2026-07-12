/**
 * POST /api/interview — Generate tailored interview questions + prep tips.
 */

export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { orchestrate } from "@/lib/agents/orchestrator";
import { getCvById, getUserCvs } from "@/lib/snowflake/queries";
import { cvParser } from "@/lib/agents/cv-parser";
import { isPerplexityConfigured } from "@/lib/perplexity/config";
import { getAuthenticatedUser, badRequest, serverError, apiError } from "@/lib/api-response";

const InterviewSchema = z.object({
  cvId: z.string().uuid().optional(),
  targetContext: z.string().max(2000).optional(),
  journey: z.enum(["job", "academic"]).default("job"),
});

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
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  if (!isPerplexityConfigured()) {
    return apiError("SERVICE_UNAVAILABLE", "Interview prep is not available. Perplexity API key is not configured.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = InterviewSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const cvSummary = await buildCvSummary(userId, parsed.data.cvId);
  if (!cvSummary) {
    return badRequest("Upload a CV first to generate a personalized interview prep.");
  }

  try {
    const result = await orchestrate({
      task: "interview_prep",
      userId,
      payload: {
        cvSummary,
        targetContext: parsed.data.targetContext || "",
        journey: parsed.data.journey,
      },
    });

    if (!result.success) {
      return serverError((result.data as { error?: string })?.error || "Interview prep failed. Try again later.");
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: { cached: result.cached, processingTime: result.processingTime },
    });
  } catch (err) {
    console.error("Interview route error:", err);
    return serverError("An unexpected error occurred while preparing interview questions.");
  }
}
