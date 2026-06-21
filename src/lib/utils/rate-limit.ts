import { getUserUsageCount } from "@/lib/snowflake/queries";
import { TIER_LIMITS, type TierName } from "@/config/tiers";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetInHours: number;
}

/**
 * Check if a user is within their tier's rate limit for a given action.
 */
export async function checkRateLimit(
  userId: string,
  tier: TierName,
  actionType: string
): Promise<RateLimitResult> {
  const tierConfig = TIER_LIMITS[tier];
  const actionLimit = tierConfig.limits[actionType];

  // No limit defined = unlimited
  if (!actionLimit) {
    return { allowed: true, remaining: Infinity, limit: Infinity, resetInHours: 0 };
  }

  const { maxCount, periodDays } = actionLimit;

  const currentCount = await getUserUsageCount(userId, actionType, periodDays);

  return {
    allowed: currentCount < maxCount,
    remaining: Math.max(0, maxCount - currentCount),
    limit: maxCount,
    resetInHours: periodDays * 24,
  };
}

/**
 * Enforce rate limit — throws if exceeded.
 */
export async function enforceRateLimit(
  userId: string,
  tier: TierName,
  actionType: string
): Promise<void> {
  const result = await checkRateLimit(userId, tier, actionType);
  if (!result.allowed) {
    throw new RateLimitError(
      `Rate limit exceeded for ${actionType}. Limit: ${result.limit}, resets in ${result.resetInHours}h. Upgrade your plan for higher limits.`
    );
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}
