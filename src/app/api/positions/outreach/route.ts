export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { orchestrate } from "@/lib/agents/orchestrator";
import { cvParser } from "@/lib/agents/cv-parser";
import { getUserCvs, getCvById } from "@/lib/snowflake/queries";
import { isPerplexityConfigured } from "@/lib/perplexity/config";
import { getAuthenticatedUser, badRequest, serverError, apiError } from "@/lib/api-response";

const outreachSchema = z.object({
  positionContext: z.string().min(10, "Position context is required"),
  professorName: z.string().optional(),
  cvId: z.string().uuid().optional(),
  instructions: z.string().optional(),
});

/** Build a CV summary from a specific CV or the user's most recent one. */
async function buildCvSummary(userId: string, cvId?: string): Promise<string | null> {
  const row = cvId
    ? await getCvById(cvId, userId)
    : ((await getUserCvs(userId))?.[0] as { PARSED_JSON?: unknown } | undefined) ?? null;
  const parsedJson = (row as { PARSED_JSON?: unknown } | null)?.PARSED_JSON;
  if (!parsedJson) return null;
  const parsed =
    typeof parsedJson === "string" ? JSON.parse(parsedJson) : parsedJson;
  return cvParser.buildSummary(cvParser.normalize(parsed as Record<string, unknown>));
}

// POST /api/positions/outreach — draft a personalized professor outreach email
export async function POST(req: NextRequest) {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  if (!isPerplexityConfigured()) {
    return apiError("SERVICE_UNAVAILABLE", "Outreach drafting is not available. Perplexity API key is not configured.", 503);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = outreachSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || "Invalid input");
  }

  try {
    const cvSummary = await buildCvSummary(userId, parsed.data.cvId);
    if (!cvSummary) {
      return badRequest("Upload a CV first to draft a personalized outreach email.");
    }

    const result = await orchestrate({
      task: "generate_outreach",
      userId,
      payload: {
        cvSummary,
        positionContext: parsed.data.positionContext,
        professorName: parsed.data.professorName,
        userInstructions: parsed.data.instructions,
      },
    });

    if (!result.success) {
      return serverError("Could not draft the outreach email. Please try again.");
    }

    return NextResponse.json({ success: true, data: result.data, cached: result.cached });
  } catch (err) {
    console.error("[outreach] Error:", err);
    return serverError("Could not draft the outreach email. Please try again.");
  }
}
