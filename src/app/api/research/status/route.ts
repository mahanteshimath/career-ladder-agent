/**
 * GET /api/research/status — Check if AI research is available for the current user.
 * Returns availability, remaining quota, and reasons if disabled.
 */

import { isPerplexityConfigured } from "@/lib/perplexity/config";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { checkDailyCap } from "@/lib/perplexity/daily-cap";
import { apiSuccess, getAuthenticatedUser } from "@/lib/api-response";

export async function GET() {
  const { userId, tier, error } = await getAuthenticatedUser();
  if (error) return error;

  // Check if Perplexity is configured
  if (!isPerplexityConfigured()) {
    return apiSuccess({
      available: false,
      reason: "AI Research service is not configured on this deployment.",
    });
  }

  // Check global daily cap
  const capCheck = await checkDailyCap();
  if (!capCheck.allowed) {
    return apiSuccess({
      available: false,
      reason: "Daily AI research limit has been reached. Try again tomorrow.",
      remaining: 0,
    });
  }

  // Check tier limit
  const rateCheck = await checkRateLimit(
    userId,
    tier as "free" | "basic" | "premium",
    "research"
  );

  if (!rateCheck.allowed) {
    return apiSuccess({
      available: false,
      reason:
        tier === "free"
          ? "AI Research requires a Basic or Premium subscription."
          : `You've used all ${rateCheck.limit} research credits for this period. Resets in ${rateCheck.resetInHours}h.`,
      remaining: 0,
      limit: rateCheck.limit,
    });
  }

  return apiSuccess({
    available: true,
    remaining: rateCheck.remaining,
    limit: rateCheck.limit,
    globalRemaining: capCheck.remaining,
  });
}
