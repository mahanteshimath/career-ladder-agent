/**
 * Global daily cap for Perplexity API calls.
 * Prevents runaway costs if the app has many users.
 * Uses CL_USAGE table with a special system-level action type.
 */

import { executeQuery } from "@/lib/snowflake/client";
import { PERPLEXITY_DAILY_CAP } from "./config";

const SYSTEM_USER_ID = "__system__";
const ACTION_TYPE = "perplexity_call";

/**
 * Check if the global daily cap still has room.
 */
export async function checkDailyCap(): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  if (PERPLEXITY_DAILY_CAP <= 0) {
    return { allowed: true, remaining: 999 }; // Unlimited if cap is 0 or negative
  }

  try {
    const result = await executeQuery(
      `SELECT COUNT(*) AS CNT FROM CL_USAGE 
       WHERE USER_ID = ? AND ACTION_TYPE = ? 
       AND CREATED_AT >= DATEADD('hour', -24, CURRENT_TIMESTAMP())`,
      [SYSTEM_USER_ID, ACTION_TYPE]
    );

    const count = (result.rows[0]?.CNT as number) || 0;
    const remaining = Math.max(0, PERPLEXITY_DAILY_CAP - count);

    return { allowed: remaining > 0, remaining };
  } catch (err) {
    console.error("[daily-cap] Check failed, allowing request:", err);
    // Fail open — if we can't check, allow the request
    return { allowed: true, remaining: PERPLEXITY_DAILY_CAP };
  }
}

/**
 * Increment the daily cap counter after a successful Perplexity call.
 */
export async function incrementDailyCap(): Promise<void> {
  try {
    await executeQuery(
      `INSERT INTO CL_USAGE (USER_ID, ACTION_TYPE) VALUES (?, ?)`,
      [SYSTEM_USER_ID, ACTION_TYPE]
    );
  } catch (err) {
    console.error("[daily-cap] Increment failed:", err);
  }
}
