export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { orchestrate } from "@/lib/agents/orchestrator";
import { getCvById, insertDraft, trackUsage } from "@/lib/snowflake/queries";
import { cvParser } from "@/lib/agents/cv-parser";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import { getAuthenticatedUser } from "@/lib/api-response";
import { z } from "zod";

const generateSchema = z.object({
  cvId: z.string().uuid(),
  type: z.enum(["sop", "cover_letter"]),
  targetContext: z.string().min(10),
  instructions: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { userId, tier, error } = await getAuthenticatedUser();
  if (error) return error;

  // Tier check — disabled for testing
  // if (tier === "free") {
  //   return NextResponse.json(
  //     { success: false, error: "Upgrade to Basic or Premium to generate documents" },
  //     { status: 403 }
  //   );
  // }

  // Rate limit — disabled for testing
  // try {
  //   await enforceRateLimit(userId, tier, "sop_generate");
  // } catch (err) {
  //   return NextResponse.json(
  //     { success: false, error: (err as Error).message },
  //     { status: 429 }
  //   );
  // }

  const body = await request.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { cvId, type, targetContext, instructions } = parsed.data;

  try {
    const cv = await getCvById(cvId);
    if (!cv || cv.USER_ID !== userId) {
      return NextResponse.json(
        { success: false, error: "CV not found" },
        { status: 404 }
      );
    }

    const cvParsed =
      typeof cv.PARSED_JSON === "string"
        ? JSON.parse(cv.PARSED_JSON)
        : cv.PARSED_JSON;
    const cvSummary = cvParser.buildSummary(cvParser.normalize(cvParsed as Record<string, unknown>));

    const task = type === "sop" ? "generate_sop" : "generate_cover_letter";
    const payload =
      type === "sop"
        ? { cvSummary, positionContext: targetContext, userInstructions: instructions }
        : { cvSummary, jobDescription: targetContext, userInstructions: instructions };

    const result = await orchestrate({ task, userId, payload });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Generation failed" },
        { status: 500 }
      );
    }

    // Save draft
    await insertDraft({
      userId,
      type,
      content: (result.data as { content: string }).content,
      context: { cvId, targetContext, instructions },
    });

    await trackUsage(userId, "sop_generate", cvId);

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: { cached: result.cached, processingTime: result.processingTime },
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
