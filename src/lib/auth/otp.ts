import { executeQuery } from "@/lib/snowflake/client";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

/**
 * Generate and store a 6-digit OTP for email verification.
 * Rate-limited: max 5 attempts per email per 10 minutes.
 */
export async function generateOtp(email: string): Promise<{ success: boolean; message: string }> {
  // Check rate limit - count recent OTP requests for this email
  const recent = await executeQuery(
    `SELECT COUNT(*) AS CNT FROM CL_OTP_CODES
     WHERE EMAIL = ? AND CREATED_AT > DATEADD('minute', -${OTP_EXPIRY_MINUTES}, CURRENT_TIMESTAMP())`,
    [email]
  );

  const count = (recent.rows[0] as { CNT: number })?.CNT || 0;
  if (count >= MAX_ATTEMPTS) {
    return { success: false, message: "Too many attempts. Please try again in 10 minutes." };
  }

  // Generate secure 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();

  // Hash OTP before storing (never store plain OTP in DB)
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  // Store in DB
  await executeQuery(
    `INSERT INTO CL_OTP_CODES (EMAIL, OTP_HASH, EXPIRES_AT)
     VALUES (?, ?, DATEADD('minute', ${OTP_EXPIRY_MINUTES}, CURRENT_TIMESTAMP()))`,
    [email, hashedOtp]
  );

  // Send OTP email
  await sendEmail({
    to: email,
    subject: "Your Career Ladder sign-in code",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 40px; height: 40px; background: #2563eb; border-radius: 10px; line-height: 40px; color: white; font-weight: bold; font-size: 16px;">CL</div>
        </div>
        <h2 style="color: #1e293b; text-align: center; margin-bottom: 8px;">Your sign-in code</h2>
        <p style="color: #64748b; text-align: center; font-size: 14px; margin-bottom: 24px;">
          Enter this code to sign in to Career Ladder
        </p>
        <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e293b;">${otp}</span>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, ignore this email.
        </p>
      </div>
    `,
  });

  return { success: true, message: "Verification code sent to your email." };
}

/**
 * Verify an OTP code for the given email.
 * Returns true if valid, false otherwise. Invalidates OTP after successful verification.
 */
export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  // Find matching unexpired OTP
  const result = await executeQuery(
    `SELECT ID FROM CL_OTP_CODES
     WHERE EMAIL = ? AND OTP_HASH = ? AND EXPIRES_AT > CURRENT_TIMESTAMP() AND USED = FALSE
     ORDER BY CREATED_AT DESC LIMIT 1`,
    [email, hashedOtp]
  );

  if (!result.rows[0]) return false;

  // Mark OTP as used (prevent replay)
  const otpId = (result.rows[0] as { ID: string }).ID;
  await executeQuery(
    `UPDATE CL_OTP_CODES SET USED = TRUE WHERE ID = ?`,
    [otpId]
  );

  return true;
}
