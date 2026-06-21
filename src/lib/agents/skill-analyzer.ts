import { callPerplexity, isPerplexityError } from "@/lib/perplexity/client";
import { parseJsonResponse } from "@/lib/perplexity/json-utils";

export interface SkillGap {
  skill: string;
  required: boolean;
  candidateLevel: "none" | "basic" | "intermediate" | "advanced";
  requiredLevel: "basic" | "intermediate" | "advanced";
  gap: "none" | "minor" | "moderate" | "significant";
  suggestion?: string;
}

export interface SkillAnalysis {
  overallFitScore: number; // 0-100
  matchedSkills: string[];
  missingSkills: string[];
  gaps: SkillGap[];
  recommendations: string[];
  transferableSkills: string[];
}

/**
 * Skill Analyzer agent — performs gap analysis between CV and job requirements.
 */
export const skillAnalyzer = {
  async analyze(
    cvParsed: Record<string, unknown>,
    jobDescription: string
  ): Promise<SkillAnalysis> {
    const cvSkills = (cvParsed.skills as string[]) || [];
    const cvExperience = JSON.stringify(cvParsed.experience || []);

    const systemPrompt = `You are a career advisor performing a skill gap analysis. Compare the candidate's skills with job requirements and return ONLY valid JSON.

Return this exact JSON structure:
{
  "overallFitScore": 75,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3", "skill4"],
  "gaps": [
    {
      "skill": "Python",
      "required": true,
      "candidateLevel": "intermediate",
      "requiredLevel": "advanced",
      "gap": "minor",
      "suggestion": "Take advanced Python courses or contribute to open source"
    }
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ],
  "transferableSkills": ["skill that transfers from their experience to this role"]
}

Return ONLY valid JSON, no markdown formatting or explanation.`;

    const userPrompt = `CANDIDATE SKILLS:
${cvSkills.join(", ")}

CANDIDATE EXPERIENCE:
${cvExperience.slice(0, 2000)}

JOB DESCRIPTION:
${jobDescription.slice(0, 2000)}

Analyze and return JSON:`;

    const result = await callPerplexity(systemPrompt, userPrompt, {
      model: "sonar",
      temperature: 0,
      timeout: 45_000,
    });

    if (isPerplexityError(result)) {
      throw new Error(`Skill analysis failed: ${result.error}`);
    }

    const parsed = parseJsonResponse(result.content);
    if (!parsed || parsed.length === 0) {
      throw new Error("Failed to parse skill analysis response");
    }

    const analysis = parsed[0] as SkillAnalysis;

    // Validate
    if (typeof analysis.overallFitScore !== "number") {
      analysis.overallFitScore = 50;
    }
    analysis.overallFitScore = Math.max(0, Math.min(100, analysis.overallFitScore));
    analysis.matchedSkills = analysis.matchedSkills || [];
    analysis.missingSkills = analysis.missingSkills || [];
    analysis.gaps = analysis.gaps || [];
    analysis.recommendations = analysis.recommendations || [];
    analysis.transferableSkills = analysis.transferableSkills || [];

    return analysis;
  },
};
