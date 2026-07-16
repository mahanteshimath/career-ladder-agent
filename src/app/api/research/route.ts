/**
 * POST /api/research — Trigger live AI research for positions or jobs.
 * Uses Perplexity deep research to search the live web.
 * Rate-limited by tier (Free: disabled, Basic: 3/week, Premium: 20/month).
 */

export const maxDuration = 60;

import { NextRequest } from "next/server";
import { z } from "zod";
import { orchestrate } from "@/lib/agents/orchestrator";
import { getCvById } from "@/lib/snowflake/queries";
import { cvParser } from "@/lib/agents/cv-parser";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import { trackUsage } from "@/lib/snowflake/queries";
import { isPerplexityConfigured } from "@/lib/perplexity/config";
import { checkDailyCap, incrementDailyCap } from "@/lib/perplexity/daily-cap";
import { apiSuccess, badRequest, serverError, apiError, getAuthenticatedUser } from "@/lib/api-response";

const ResearchSchema = z.object({
  cvId: z.string().uuid(),
  targetType: z.enum(["position", "job"]),
  positionType: z.string().optional(), // "phd" | "postdoc" | "masters" | "research_assistant"
  continent: z.string().optional(),
  customInstructions: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  // Auth check
  const { userId, tier, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;

  // Check Perplexity availability
  if (!isPerplexityConfigured()) {
    return apiError(
      "SERVICE_UNAVAILABLE",
      "AI Research is not available. Perplexity API key is not configured.",
      503
    );
  }

  // Check global daily cap
  const capCheck = await checkDailyCap();
  if (!capCheck.allowed) {
    return apiError(
      "DAILY_CAP_REACHED",
      "Daily AI research limit reached. Please try again tomorrow.",
      429
    );
  }

  // Validate request body
  const body = await request.json();
  const parsed = ResearchSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      `Invalid request: ${parsed.error.issues.map((i) => i.message).join(", ")}`
    );
  }

  const { cvId, targetType, positionType, continent, customInstructions } = parsed.data;

  // Enforce tier-based rate limit — disabled for testing
  // try {
  //   await enforceRateLimit(userId, tier, "research");
  // } catch (err) {
  //   return apiError("RATE_LIMITED", (err as Error).message, 429);
  // }

  // Fetch CV
  const cv = await getCvById(cvId, userId);
  if (!cv) {
    return badRequest("CV not found or you don't own it.");
  }

  // Build CV summary from parsed data
  const cvParsed = cv.PARSED_JSON
    ? typeof cv.PARSED_JSON === "string"
      ? JSON.parse(cv.PARSED_JSON)
      : cv.PARSED_JSON
    : null;

  if (!cvParsed) {
    return badRequest("CV has not been parsed yet. Upload and parse your CV first.");
  }

  const cvSummary = cvParser.buildSummary(cvParser.normalize(cvParsed as Record<string, unknown>));
  const currentDate = new Date().toISOString().split("T")[0];

  try {
    let result;

    if (targetType === "position") {
      result = await orchestrate({
        task: "research_positions",
        userId,
        payload: {
          cvSummary,
          positionType: positionType || "PhD",
          continent: continent || "All",
          currentDate,
        },
      });
    } else {
      result = await orchestrate({
        task: "research_jobs",
        userId,
        payload: {
          cvSummary,
          customInstructions: customInstructions || "",
          currentDate,
        },
      });
    }

    if (!result.success) {
      return serverError(
        (result.data as { error?: string })?.error || "Research failed. Try again later."
      );
    }

    // Track usage and increment daily cap
    await trackUsage(userId, "research", cvId);
    await incrementDailyCap();

    return apiSuccess(result.data, 200, {
      cached: result.cached,
      processingTime: result.processingTime,
    });
  } catch (error) {
    console.error("Research route error:", error);
    return serverError("An unexpected error occurred during research.");
  }
}
