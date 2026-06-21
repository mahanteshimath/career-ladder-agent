export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { orchestrate } from "@/lib/agents/orchestrator";
import { getCvById, insertMatch, trackUsage } from "@/lib/snowflake/queries";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import { getAuthenticatedUser } from "@/lib/api-response";
import type { MatchSearchRequest } from "@/types";
import { z } from "zod";

const matchSchema = z.object({
  cvId: z.string().uuid(),
  targetType: z.enum(["job", "position"]),
  keywords: z.array(z.string()).optional(),
  filters: z.record(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const { userId, tier, error } = await getAuthenticatedUser();
  if (error) return error;

  // Rate limit
  try {
    await enforceRateLimit(userId, tier, "match");
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 429 }
    );
  }

  // Validate request body
  const body = await request.json();
  const parsed = matchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { cvId, targetType, keywords, filters } = parsed.data;

  try {
    // Get CV
    const cv = await getCvById(cvId);
    if (!cv || cv.USER_ID !== userId) {
      return NextResponse.json(
        { success: false, error: "CV not found" },
        { status: 404 }
      );
    }

    const cvText = cv.RAW_TEXT as string;
    const cvKeywords = keywords || (cv.PARSED_JSON as { keywords?: string[] })?.keywords || [];

    // Run matching via orchestrator
    const task = targetType === "job" ? "match_jobs" : "match_positions";
    const result = await orchestrate({
      task,
      userId,
      payload: { cvText, keywords: cvKeywords, filters },
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Matching failed" },
        { status: 500 }
      );
    }

    // Store top matches
    const matches = result.data as Array<{ id: string; score: number; matchMethod: string }>;
    for (const match of matches.slice(0, 20)) {
      await insertMatch({
        userId,
        cvId,
        targetType,
        targetId: match.id,
        score: match.score,
        matchMethod: match.matchMethod as "keyword" | "semantic" | "hybrid",
      });
    }

    await trackUsage(userId, "match", cvId);

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: { cached: result.cached, processingTime: result.processingTime },
    });
  } catch (error) {
    console.error("Match error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
