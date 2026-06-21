import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = "Career Ladder <noreply@careerladder.dev>";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!resend) {
    // Dev fallback: log to console so OTP can be tested without email service
    console.log("\n╔══════════════════════════════════════════════════════╗");
    console.log("║  📧 EMAIL (Dev Mode - No RESEND_API_KEY set)        ║");
    console.log("╠══════════════════════════════════════════════════════╣");
    console.log(`║  To: ${to}`);
    console.log(`║  Subject: ${subject}`);
    console.log("║  Body: (check terminal for OTP code)");
    // Extract OTP from HTML if present
    const otpMatch = html.match(/(\d{6})/);
    if (otpMatch) {
      console.log(`║  🔑 OTP CODE: ${otpMatch[1]}`);
    }
    console.log("╚══════════════════════════════════════════════════════╝\n");
    return;
  }

  await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
}

// ─── TEMPLATES ─────────────────────────────────────────────────

export function matchResultsExpiringEmail(userName: string, daysLeft: number): { subject: string; html: string } {
  return {
    subject: `Your match results expire in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e293b;">Results Expiring Soon</h2>
        <p style="color: #475569; line-height: 1.6;">
          Hi ${userName},<br/><br/>
          Your job match results will expire in <strong>${daysLeft} day${daysLeft > 1 ? "s" : ""}</strong>.
          Download or save them before they're removed.
        </p>
        <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #2563eb; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
          View Dashboard
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
          Upgrade to Premium for permanent access to all results.
        </p>
      </div>
    `,
  };
}

export function jobPostApprovedEmail(posterName: string, jobTitle: string): { subject: string; html: string } {
  return {
    subject: `Your job post "${jobTitle}" has been approved`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e293b;">Job Post Approved ✓</h2>
        <p style="color: #475569; line-height: 1.6;">
          Hi ${posterName},<br/><br/>
          Your job post <strong>"${jobTitle}"</strong> has been approved and is now live on Career Ladder.
          Candidates can now discover and apply to your opening.
        </p>
        <a href="${process.env.NEXTAUTH_URL}" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #16a34a; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
          View on Career Ladder
        </a>
      </div>
    `,
  };
}

export function welcomeEmail(userName: string): { subject: string; html: string } {
  return {
    subject: "Welcome to Career Ladder 🚀",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e293b;">Welcome aboard, ${userName}!</h2>
        <p style="color: #475569; line-height: 1.6;">
          You're all set to start your career journey. Here's what you can do:
        </p>
        <ul style="color: #475569; line-height: 1.8;">
          <li>Upload your CV for AI-powered job matching</li>
          <li>Generate tailored SOPs and cover letters</li>
          <li>Build professional CVs with templates</li>
          <li>Discover academic positions and industry jobs</li>
        </ul>
        <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #2563eb; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
          Get Started
        </a>
      </div>
    `,
  };
}
