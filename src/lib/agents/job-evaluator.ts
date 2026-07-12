import { callPerplexity, isPerplexityError } from "@/lib/perplexity/client";
import { isPerplexityConfigured } from "@/lib/perplexity/config";
import { parseJsonResponse } from "@/lib/perplexity/json-utils";

export interface EvaluationReport {
  overallScore: number;
  recommendation: "strong_match" | "good_match" | "weak_match" | "skip";
  blocks: {
    title: string;
    content: Record<string, unknown>;
  }[];
}

const JOB_EVAL_PROMPT = `You are a career evaluation expert. Given a job posting/description and a candidate's CV summary, produce a structured evaluation.

Return ONLY valid JSON with this structure:
{
  "overallScore": 0.0-1.0 (how well the candidate matches),
  "recommendation": "strong_match" | "good_match" | "weak_match" | "skip",
  "blocks": [
    {
      "title": "Role Summary",
      "content": {
        "jobTitle": "...",
        "company": "...",
        "seniority": "junior|mid|senior|lead",
        "type": "full_time|part_time|contract|internship",
        "location": "...",
        "domain": "...",
        "tldr": "2-sentence summary of the role"
      }
    },
    {
      "title": "Match Analysis",
      "content": {
        "matchedSkills": ["skills the candidate has that match"],
        "missingSkills": ["required skills the candidate lacks"],
        "experienceGap": "description of experience gap if any",
        "mitigationStrategies": ["how to address each gap"],
        "fitPercentage": 0-100
      }
    },
    {
      "title": "Market Intelligence",
      "content": {
        "estimatedSalary": "range if detectable",
        "marketDemand": "high|medium|low",
        "competitionLevel": "high|medium|low",
        "growthPotential": "description of career growth"
      }
    },
    {
      "title": "Action Plan",
      "content": {
        "cvChanges": ["specific CV modifications to improve chances"],
        "interviewPrep": ["topics to prepare for"],
        "keywordsToAdd": ["ATS keywords missing from CV"],
        "applicationTip": "one specific tip for this application"
      }
    }
  ]
}`;

const ACADEMIC_EVAL_PROMPT = `You are an academic career evaluation expert. Given a program/position description and a candidate's CV summary, produce a structured evaluation.

Return ONLY valid JSON with this structure:
{
  "overallScore": 0.0-1.0 (how well the candidate matches),
  "recommendation": "strong_match" | "good_match" | "weak_match" | "skip",
  "blocks": [
    {
      "title": "Program Summary",
      "content": {
        "programName": "...",
        "university": "...",
        "department": "...",
        "type": "masters|phd|postdoc|research_assistant",
        "deadline": "if mentioned",
        "funding": "funded|self-funded|partial|unknown",
        "location": "...",
        "tldr": "2-sentence summary of the opportunity"
      }
    },
    {
      "title": "Profile Fit",
      "content": {
        "researchAlignment": "how well research interests align (description)",
        "prerequisitesMet": ["prerequisites the candidate meets"],
        "prerequisitesMissing": ["prerequisites the candidate lacks"],
        "academicStrength": "strongest academic qualification relevant here",
        "fitPercentage": 0-100
      }
    },
    {
      "title": "Application Strategy",
      "content": {
        "sopAngle": "recommended SOP narrative angle",
        "experiencesToHighlight": ["specific experiences to emphasize"],
        "professorResearch": "relevant professor/lab info if detectable",
        "differentiator": "what makes this candidate unique for this program"
      }
    },
    {
      "title": "Action Plan",
      "content": {
        "documentsNeeded": ["list of typical documents for this application"],
        "timeline": "suggested preparation timeline",
        "keyContacts": "who to reach out to (if detectable)",
        "applicationTip": "one specific tip for this application"
      }
    }
  ]
}`;

/**
 * Evaluation agent — structured fit assessment for job postings or academic programs.
 * Adapts its output based on the target type (job vs academic).
 */
export const evaluator = {
  async evaluate(
    inputContent: string,
    inputType: "url" | "text",
    cvSummary: string,
    targetType: string,
    userProfile?: Record<string, unknown>
  ): Promise<EvaluationReport> {
    if (!isPerplexityConfigured()) {
      return this.fallbackReport();
    }

    const isAcademic = ["phd", "postdoc", "masters"].includes(targetType);
    const systemPrompt = isAcademic ? ACADEMIC_EVAL_PROMPT : JOB_EVAL_PROMPT;

    const userMessage = `
Candidate CV Summary:
${cvSummary}

${userProfile ? `Candidate Profile: Goal=${userProfile.goal}, Field=${userProfile.field}, Level=${userProfile.level}` : ""}

${inputType === "url" ? "Job/Program URL (research this):" : "Job/Program Description:"}
${inputContent.slice(0, 8000)}

IMPORTANT: Base the Role/Program Summary strictly on the actual posting content${inputType === "url" ? " you retrieve from the URL" : " provided above"}. Do NOT invent the job title, company/university, location, salary, or requirements. If a detail is missing, use "Not specified".${inputType === "url" ? " If you cannot access the URL, say so explicitly in the tldr instead of guessing." : ""}

Evaluate how well this candidate matches this ${isAcademic ? "academic opportunity" : "job posting"}. Be specific and actionable.`;

    const result = await callPerplexity(systemPrompt, userMessage, {
      model: "sonar",
      temperature: 0.1,
      timeout: 90_000,
    });

    if (isPerplexityError(result)) {
      console.error("[evaluator] Perplexity error:", result.error);
      return this.fallbackReport();
    }

    const parsed = parseJsonResponse(result.content);
    if (parsed && parsed.length > 0 && typeof parsed[0] === "object" && parsed[0] !== null) {
      const report = parsed[0] as Record<string, unknown>;
      return this.normalizeReport(report);
    }

    return this.fallbackReport();
  },

  normalizeReport(raw: Record<string, unknown>): EvaluationReport {
    const validRecs = ["strong_match", "good_match", "weak_match", "skip"] as const;
    const rec = String(raw.recommendation || "weak_match");

    return {
      overallScore: Math.max(0, Math.min(1, Number(raw.overallScore) || 0.5)),
      recommendation: validRecs.includes(rec as typeof validRecs[number])
        ? (rec as EvaluationReport["recommendation"])
        : "weak_match",
      blocks: Array.isArray(raw.blocks)
        ? raw.blocks.map((b: Record<string, unknown>) => ({
            title: String(b.title || "Untitled"),
            content: (typeof b.content === "object" && b.content !== null)
              ? (b.content as Record<string, unknown>)
              : {},
          }))
        : [],
    };
  },

  fallbackReport(): EvaluationReport {
    return {
      overallScore: 0,
      recommendation: "weak_match",
      blocks: [
        {
          title: "Error",
          content: {
            message: "Unable to generate evaluation. Please check your Perplexity API configuration and try again.",
          },
        },
      ],
    };
  },
};
