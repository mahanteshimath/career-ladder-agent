import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/snowflake/client";
import { sendEmail, matchResultsExpiringEmail } from "@/lib/email";

/**
 * Cron: Send expiry warning emails to Basic-tier users 
 * whose match results will expire in 2 days.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find Basic users with results expiring in 2 days
    const result = await executeQuery(`
      SELECT DISTINCT u.USER_ID, u.EMAIL, u.NAME
      FROM CL_USERS u
      JOIN CL_MATCHES m ON u.USER_ID = m.USER_ID
      WHERE u.TIER = 'basic'
      AND m.CREATED_AT BETWEEN DATEADD('day', -12, CURRENT_TIMESTAMP())
                           AND DATEADD('day', -11, CURRENT_TIMESTAMP())
    `);

    let sent = 0;
    for (const row of result.rows) {
      const user = row as { EMAIL: string; NAME: string };
      if (user.EMAIL) {
        const { subject, html } = matchResultsExpiringEmail(user.NAME || "there", 2);
        await sendEmail({ to: user.EMAIL, subject, html });
        sent++;
      }
    }

    return NextResponse.json({ success: true, emailsSent: sent });
  } catch (error) {
    console.error("Notify expiry error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
