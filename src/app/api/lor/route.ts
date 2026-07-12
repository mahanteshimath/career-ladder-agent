/**
 * POST /api/lor — Draft a Letter of Recommendation from the recommender's view.
 */

export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { orchestrate } from "@/lib/agents/orchestrator";
import { getCvById, getUserCvs } from "@/lib/snowflake/queries";
import { cvParser } from "@/lib/agents/cv-parser";
import { isPerplexityConfigured } from "@/lib/perplexity/config";
import { getAuthenticatedUser, badRequest, serverError, apiError } from "@/lib/api-response";

const LorSchema = z.object({
  cvId: z.string().uuid().optional(),
  recommenderName: z.string().max(120).optional(),
  recommenderTitle: z.string().max(160).optional(),
  relationship: z.string().max(300).optional(),
  duration: z.string().max(120).optional(),
  targetContext: z.string().min(3).max(1000),
  strengths: z.string().max(1000).optional(),
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
    return apiError("SERVICE_UNAVAILABLE", "Letter drafting is not available. Perplexity API key is not configured.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = LorSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const cvSummary = await buildCvSummary(userId, parsed.data.cvId);
  if (!cvSummary) {
    return badRequest("Upload a CV first to draft a letter of recommendation.");
  }

  const d = parsed.data;
  const recommenderContext = [
    d.recommenderName ? `Recommender: ${d.recommenderName}` : "",
    d.recommenderTitle ? `Title/Affiliation: ${d.recommenderTitle}` : "",
    d.relationship ? `Relationship: ${d.relationship}` : "",
    d.duration ? `Known for: ${d.duration}` : "",
    d.strengths ? `Strengths to emphasize: ${d.strengths}` : "",
  ]
    .filter(Boolean)
    .join("\n") || "Not specified — keep the signature block generic.";

  try {
    const result = await orchestrate({
      task: "generate_lor",
      userId,
      payload: {
        candidateProfile: cvSummary,
        recommenderContext,
        targetContext: d.targetContext,
      },
    });

    if (!result.success) {
      return serverError((result.data as { error?: string })?.error || "Letter generation failed. Try again later.");
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: { cached: result.cached, processingTime: result.processingTime },
    });
  } catch (err) {
    console.error("LOR route error:", err);
    return serverError("An unexpected error occurred while drafting the letter.");
  }
}
