export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { orchestrate } from "@/lib/agents/orchestrator";
import { getAuthenticatedUser, badRequest, serverError } from "@/lib/api-response";
import { getUserCvs, getUserProfile, insertEvaluation } from "@/lib/snowflake/queries";

const evaluateSchema = z.object({
  inputContent: z.string().min(20, "Provide at least 20 characters of content to evaluate"),
  inputType: z.enum(["url", "text"]),
  cvId: z.string().uuid().optional(),
  targetType: z.enum(["job", "masters", "phd", "postdoc"]).optional(),
});

/**
 * Build a concise but information-rich CV summary for the evaluator.
 * Previously the route passed only the 2-3 sentence `summary` field (losing
 * skills/experience context) or a raw JSON dump (which confused the model).
 */
function buildCvSummary(parsed: Record<string, unknown> | null | undefined): string {
  if (!parsed || typeof parsed !== "object") return "";
  const p = parsed as Record<string, unknown>;
  const parts: string[] = [];

  if (p.name) parts.push(`Name: ${String(p.name)}`);

  const skills = p.skills;
  if (Array.isArray(skills) && skills.length) {
    parts.push(`Skills: ${skills.slice(0, 25).map(String).join(", ")}`);
  }

  const experience = p.experience;
  if (Array.isArray(experience) && experience.length) {
    const exp = experience
      .slice(0, 4)
      .map((e) => {
        const ex = e as Record<string, unknown>;
        return `${ex.title || ""} at ${ex.company || ""} (${ex.duration || ""})`.trim();
      })
      .join("; ");
    parts.push(`Experience: ${exp}`);
  }

  const education = p.education;
  if (Array.isArray(education) && education.length) {
    const edu = education
      .slice(0, 3)
      .map((e) => {
        const ed = e as Record<string, unknown>;
        return `${ed.degree || ""} from ${ed.institution || ""} ${ed.year || ""}`.trim();
      })
      .join("; ");
    parts.push(`Education: ${edu}`);
  }

  const publications = p.publications;
  if (Array.isArray(publications) && publications.length) {
    parts.push(`Publications: ${publications.length} listed`);
  }

  if (p.summary) parts.push(`Summary: ${String(p.summary)}`);

  const keywords = p.keywords;
  if (Array.isArray(keywords) && keywords.length) {
    parts.push(`Keywords: ${keywords.slice(0, 25).map(String).join(", ")}`);
  }

  return parts.join("\n").slice(0, 4000);
}

export async function POST(req: NextRequest) {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = evaluateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.errors[0]?.message || "Invalid input");
  }

  const { inputContent, inputType, cvId, targetType: explicitTarget } = parsed.data;

  try {
    // Get user's CV summary for comparison
    let cvSummary = "";
    if (cvId) {
      const { getCvById } = await import("@/lib/snowflake/queries");
      const cv = await getCvById(cvId);
      if (cv?.PARSED_JSON) {
        const parsed = typeof cv.PARSED_JSON === "string" ? JSON.parse(cv.PARSED_JSON) : cv.PARSED_JSON;
        cvSummary = buildCvSummary(parsed) || JSON.stringify(parsed).slice(0, 3000);
      }
    } else {
      // Use most recent CV
      const cvs = await getUserCvs(userId);
      if (cvs && cvs.length > 0) {
        const latestCv = cvs[0] as Record<string, unknown>;
        if (latestCv.PARSED_JSON) {
          const p = typeof latestCv.PARSED_JSON === "string"
            ? JSON.parse(latestCv.PARSED_JSON)
            : latestCv.PARSED_JSON;
          cvSummary = buildCvSummary(p) || JSON.stringify(p).slice(0, 3000);
        }
      }
    }

    if (!cvSummary) {
      return badRequest("Please upload a CV first so we can evaluate your fit.");
    }

    // Get user profile for context
    const profileRow = await getUserProfile(userId).catch(() => null);
    const profile = profileRow?.PROFILE_JSON as Record<string, unknown> | null;
    const targetType = explicitTarget || (profile?.goal as string) || "job";

    // Run evaluation via orchestrator
    const result = await orchestrate({
      task: "evaluate",
      userId,
      payload: {
        inputContent,
        inputType,
        cvSummary,
        targetType,
        userProfile: profile || undefined,
      },
    });

    if (!result.success) {
      return serverError("Evaluation failed. Please try again.");
    }

    // Persist the evaluation
    const evalData = result.data as Record<string, unknown>;
    await insertEvaluation({
      userId,
      cvId: cvId || undefined,
      inputType,
      inputContent: inputContent.slice(0, 5000),
      targetType,
      evaluationJson: evalData,
      overallScore: (evalData.overallScore as number) || 0,
      recommendation: (evalData.recommendation as string) || "weak_match",
    }).catch((err) => {
      console.error("[evaluate] Failed to persist evaluation:", err);
      // Non-blocking — still return the result
    });

    return NextResponse.json({ success: true, data: evalData });
  } catch (err) {
    console.error("[evaluate] Error:", err);
    return serverError("Evaluation failed. Please try again.");
  }
}
