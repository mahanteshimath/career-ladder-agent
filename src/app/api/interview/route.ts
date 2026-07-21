/**
 * POST /api/interview — Generate tailored interview questions + prep tips.
 */

export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { orchestrate } from "@/lib/agents/orchestrator";
import { getCvById, getDraftById, getUserCvs } from "@/lib/snowflake/queries";
import { cvParser } from "@/lib/agents/cv-parser";
import { isPerplexityConfigured } from "@/lib/perplexity/config";
import { getAuthenticatedUser, badRequest, serverError, apiError } from "@/lib/api-response";

const InterviewSchema = z.object({
  cvId: z.string().uuid().optional(),
  draftId: z.string().uuid().optional(),
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

/**
 * Ground interview prep in the candidate's actual application: pull the saved
 * draft's target context + the document they submitted, so questions probe what
 * the interviewer actually read. Returns "" if no/unknown draft.
 */
async function buildApplicationContext(userId: string, draftId?: string): Promise<string> {
  if (!draftId) return "";
  const draft = await getDraftById(draftId, userId).catch(() => null);
  if (!draft) return "";

  const rawContext = draft.CONTEXT;
  let contextText = "";
  try {
    const ctx = typeof rawContext === "string" ? JSON.parse(rawContext) : rawContext;
    contextText = ctx
      ? Object.values(ctx as Record<string, unknown>)
          .map((v) => (typeof v === "string" ? v : ""))
          .filter(Boolean)
          .join("\n")
      : "";
  } catch {
    contextText = typeof rawContext === "string" ? rawContext : "";
  }

  const type = String(draft.TYPE ?? "document");
  const content = String(draft.CONTENT ?? "").slice(0, 4000);

  const parts = ["APPLICATION MATERIALS (ground questions in these):"];
  if (contextText.trim()) parts.push(`Target posting/program:\n${contextText.slice(0, 3000)}`);
  if (content.trim()) parts.push(`Document the candidate submitted (${type}):\n${content}`);
  return parts.length > 1 ? parts.join("\n\n") : "";
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

  // Ground prep in the actual application when a saved draft is referenced.
  const applicationContext = await buildApplicationContext(userId, parsed.data.draftId);
  const targetContext = [applicationContext, parsed.data.targetContext?.trim() || ""]
    .filter(Boolean)
    .join("\n\n");

  try {
    const result = await orchestrate({
      task: "interview_prep",
      userId,
      payload: {
        cvSummary,
        targetContext,
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
