export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { orchestrate } from "@/lib/agents/orchestrator";
import { getCvById, insertMatch, trackUsage, getUserMatches } from "@/lib/snowflake/queries";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import { getAuthenticatedUser } from "@/lib/api-response";
import type { MatchSearchRequest } from "@/types";
import { z } from "zod";

// GET /api/matches — Retrieve user's saved matches
export async function GET() {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const rows = await getUserMatches(userId);
    const matches = (rows || []).map((row: Record<string, unknown>) => ({
      id: row.ID || row.TARGET_ID,
      title: row.TARGET_TITLE || "Untitled",
      organization: row.TARGET_ORG || "Unknown",
      score: row.SCORE || 0,
      matchMethod: row.MATCH_METHOD || "keyword",
      targetType: row.TARGET_TYPE || undefined,
      location: row.LOCATION || undefined,
      description: row.DESCRIPTION || undefined,
    }));

    return NextResponse.json({ success: true, data: matches });
  } catch (error) {
    console.error("GET matches error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

const matchSchema = z.object({
  cvId: z.string().uuid(),
  targetType: z.enum(["job", "position"]),
  keywords: z.array(z.string()).optional(),
  filters: z.record(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const { userId, tier, error } = await getAuthenticatedUser();
  if (error) return error;

  // Rate limit — disabled for testing
  // try {
  //   await enforceRateLimit(userId, tier, "match");
  // } catch (err) {
  //   return NextResponse.json(
  //     { success: false, error: (err as Error).message },
  //     { status: 429 }
  //   );
  // }

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
    // Handle both flat format { keywords: [...] } and legacy nested { cv: { keywords: [...] } }
    const parsedJson = cv.PARSED_JSON as Record<string, unknown> | null;
    const flatKeywords = parsedJson?.keywords as string[] | undefined;
    const nestedKeywords = (parsedJson?.cv as Record<string, unknown> | undefined)?.keywords as string[] | undefined;
    const cvKeywords = keywords || flatKeywords || nestedKeywords || [];

    // Run matching via orchestrator
    const task = targetType === "job" ? "match_jobs" : "match_positions";
    const result = await orchestrate({
      task,
      userId,
      payload: { cvText, keywords: cvKeywords, filters },
    });

    if (!result.success) {
      const errMsg = (result.data as { error?: string })?.error || "Matching failed";
      return NextResponse.json(
        { success: false, error: errMsg },
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
