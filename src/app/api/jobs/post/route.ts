import { NextRequest } from "next/server";
import { checkJobPostSpam } from "@/lib/agents/spam-checker";
import { submitJobPost } from "@/lib/snowflake/queries";
import { apiSuccess, badRequest, serverError } from "@/lib/api-response";
import { z } from "zod";

const postJobSchema = z.object({
  title: z.string().min(5).max(200),
  company: z.string().min(2).max(100),
  location: z.string().min(2).max(100),
  description: z.string().min(50).max(5000),
  applyUrl: z.string().url(),
  posterEmail: z.string().email(),
  salary: z.string().max(100).optional(),
  jobType: z.enum(["full-time", "part-time", "contract", "internship"]).default("full-time"),
  // Honeypot field — must be empty (bots will fill it)
  website: z.string().max(0).optional(),
});

// Simple in-memory IP rate limit (resets on cold start)
const ipSubmissions = new Map<string, { count: number; resetAt: number }>();
const IP_LIMIT = 3;
const IP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkIpLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipSubmissions.get(ip);
  if (!entry || now > entry.resetAt) {
    ipSubmissions.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return true;
  }
  if (entry.count >= IP_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  // IP rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  if (!checkIpLimit(ip)) {
    return badRequest("Too many submissions. Please try again later.");
  }

  const body = await request.json();
  const parsed = postJobSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  // Honeypot check
  if (parsed.data.website) {
    // Bot detected — silently accept but don't process
    return apiSuccess({ message: "Job post submitted for review." });
  }

  const { title, company, location, description, applyUrl, posterEmail, salary, jobType } = parsed.data;

  try {
    // AI Spam Check
    const spamResult = await checkJobPostSpam({ title, company, location, description, applyUrl, posterEmail });

    // Determine status
    let status: "approved" | "pending" | "rejected";
    if (spamResult.recommendation === "approve") {
      status = "approved";
    } else if (spamResult.recommendation === "reject") {
      status = "rejected";
    } else {
      status = "pending";
    }

    // Save to DB
    await submitJobPost({
      title,
      company,
      location,
      description,
      applyUrl,
      posterEmail,
      salary: salary || null,
      jobType,
      spamScore: spamResult.score,
      spamReason: spamResult.reason,
      status,
      ip,
    });

    return apiSuccess({
      message: status === "approved"
        ? "Job post published successfully!"
        : "Job post submitted for review. You'll receive an email once approved.",
      status,
    });
  } catch (error) {
    console.error("Job post error:", error);
    return serverError();
  }
}
