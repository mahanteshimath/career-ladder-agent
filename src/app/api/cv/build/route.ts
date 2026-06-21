import { NextRequest } from "next/server";
import { cvEnhancer } from "@/lib/agents/cv-enhancer";
import { insertDraft, trackUsage } from "@/lib/snowflake/queries";
import { enforceRateLimit } from "@/lib/utils/rate-limit";
import { apiSuccess, badRequest, serverError, getAuthenticatedUser } from "@/lib/api-response";
import { z } from "zod";

const buildSchema = z.object({
  templateId: z.string().min(1),
  personalInfo: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(5),
    location: z.string().min(2),
    linkedIn: z.string().optional(),
    portfolio: z.string().optional(),
  }),
  summary: z.string().min(20),
  experience: z.array(z.object({
    title: z.string().min(2),
    company: z.string().min(2),
    location: z.string().optional().default(""),
    startDate: z.string().min(4),
    endDate: z.string().min(2),
    highlights: z.array(z.string()),
  })),
  education: z.array(z.object({
    degree: z.string().min(2),
    institution: z.string().min(2),
    year: z.string().min(4),
    gpa: z.string().optional(),
  })),
  skills: z.array(z.string()),
  publications: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  enhance: z.boolean().default(true),
  targetRole: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { userId, tier, error } = await getAuthenticatedUser();
  if (error) return error;

  if (tier === "free") {
    return badRequest("Upgrade to Basic or Premium to use CV Builder");
  }

  try {
    await enforceRateLimit(userId, tier, "sop_generate"); // Reuse existing rate limit
  } catch (err) {
    return badRequest((err as Error).message);
  }

  const body = await request.json();
  const parsed = buildSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0].message);
  }

  const { templateId, personalInfo, summary, experience, education, skills, publications, certifications, enhance, targetRole } = parsed.data;

  try {
    let finalSummary = summary;
    let finalExperience = experience.map((e) => ({
      title: e.title,
      company: e.company,
      highlights: e.highlights,
    }));
    let finalSkills = skills;

    // AI Enhancement (optional but recommended)
    if (enhance) {
      const enhanced = await cvEnhancer.enhance(
        summary,
        experience.map((e) => ({ title: e.title, company: e.company, highlights: e.highlights })),
        skills,
        targetRole
      );
      finalSummary = enhanced.summary;
      finalExperience = enhanced.experience;
      finalSkills = enhanced.skills;
    }

    // Build CV content object
    const cvContent = {
      templateId,
      personalInfo,
      summary: finalSummary,
      experience: experience.map((e, i) => ({
        ...e,
        highlights: finalExperience[i]?.highlights || e.highlights,
      })),
      education,
      skills: finalSkills,
      publications: publications || [],
      certifications: certifications || [],
    };

    // Save as draft
    await insertDraft({
      userId,
      type: "cv",
      content: JSON.stringify(cvContent),
      context: { templateId, enhanced: enhance, targetRole },
    });

    await trackUsage(userId, "cv_generate");

    return apiSuccess({ cv: cvContent, enhanced: enhance });
  } catch (error) {
    console.error("CV build error:", error);
    return serverError();
  }
}
