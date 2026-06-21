import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/snowflake/client";

/**
 * Cron endpoint to clean up expired data:
 * - CL_MATCHES older than 14 days for Basic-tier users
 * - CL_AGENT_CACHE past TTL
 * - CL_USAGE records older than 30 days
 *
 * Triggered by Vercel Cron (see vercel.json) or manual GET with auth header.
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, number> = {};

  try {
    // 1. Expire Basic-tier match results older than 14 days
    const matchCleanup = await executeQuery(`
      DELETE FROM CL_MATCHES
      WHERE USER_ID IN (SELECT USER_ID FROM CL_USERS WHERE TIER = 'basic')
      AND CREATED_AT < DATEADD('day', -14, CURRENT_TIMESTAMP())
    `);
    results.expiredMatches = (matchCleanup as { rowCount?: number }).rowCount || 0;

    // 2. Clear stale AI cache (past TTL)
    const cacheCleanup = await executeQuery(`
      DELETE FROM CL_AGENT_CACHE
      WHERE CREATED_AT < DATEADD('second', -TTL_SECONDS, CURRENT_TIMESTAMP())
    `);
    results.expiredCache = (cacheCleanup as { rowCount?: number }).rowCount || 0;

    // 3. Clean old usage records (> 30 days)
    const usageCleanup = await executeQuery(`
      DELETE FROM CL_USAGE
      WHERE CREATED_AT < DATEADD('day', -30, CURRENT_TIMESTAMP())
    `);
    results.expiredUsage = (usageCleanup as { rowCount?: number }).rowCount || 0;

    // 4. Remove rejected job posts older than 7 days
    const jobCleanup = await executeQuery(`
      DELETE FROM CL_JOB_POSTS
      WHERE STATUS = 'rejected'
      AND CREATED_AT < DATEADD('day', -7, CURRENT_TIMESTAMP())
    `);
    results.rejectedPosts = (jobCleanup as { rowCount?: number }).rowCount || 0;

    return NextResponse.json({
      success: true,
      message: "Cleanup complete",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron cleanup error:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
