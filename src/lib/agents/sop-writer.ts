import { callPerplexity, isPerplexityError } from "@/lib/perplexity/client";

export interface GeneratedDocument {
  content: string;
  wordCount: number;
  type: "sop" | "cover_letter";
}

/**
 * SOP/Cover Letter Writer agent — generates tailored documents using Perplexity.
 */
export const sopWriter = {
  /**
   * Generate a Statement of Purpose for academic positions.
   */
  async generateSop(
    cvSummary: string,
    positionContext: string,
    userInstructions?: string
  ): Promise<GeneratedDocument> {
    const systemPrompt = `You are an expert academic writing assistant. Write a Statement of Purpose (SOP) for a graduate/faculty position application.

REQUIREMENTS:
- Write 800-1200 words
- Use formal academic tone
- Structure: Opening hook → Academic background → Research interests → Why this program/position → Future goals → Conclusion
- Be specific about the candidate's qualifications and how they align with the position
- Avoid generic phrases; make it personalized and compelling
- Do not fabricate information not present in the candidate profile
- Return ONLY the SOP text, no commentary`;

    const userPrompt = `CANDIDATE PROFILE:
${cvSummary}

TARGET POSITION/PROGRAM:
${positionContext}

${userInstructions ? `ADDITIONAL INSTRUCTIONS FROM CANDIDATE:\n${userInstructions}\n` : ""}
Write the SOP now:`;

    const result = await callPerplexity(systemPrompt, userPrompt, {
      model: "sonar",
      temperature: 0.7,
      timeout: 60_000,
    });

    if (isPerplexityError(result)) {
      throw new Error(`SOP generation failed: ${result.error}`);
    }

    const content = result.content.trim();
    if (!content || content.length < 200) {
      throw new Error("Generated SOP is too short");
    }

    return {
      content,
      wordCount: content.split(/\s+/).length,
      type: "sop",
    };
  },

  /**
   * Generate a Cover Letter for industry jobs.
   */
  async generateCoverLetter(
    cvSummary: string,
    jobDescription: string,
    userInstructions?: string
  ): Promise<GeneratedDocument> {
    const systemPrompt = `You are an expert career coach and professional writer. Write a cover letter for a job application.

REQUIREMENTS:
- Write 400-600 words
- Professional but engaging tone
- Structure: Greeting → Strong opening → Why you're a great fit (2-3 paragraphs mapping skills to requirements) → Enthusiasm for company → Call to action → Sign-off
- Highlight specific achievements from CV that match job requirements
- Quantify impact where possible
- Do not fabricate information not in the candidate profile
- Do not include placeholder text like [Company Name] — use info from the job description
- Return ONLY the cover letter text, no commentary`;

    const userPrompt = `CANDIDATE PROFILE:
${cvSummary}

JOB DESCRIPTION:
${jobDescription}

${userInstructions ? `ADDITIONAL INSTRUCTIONS FROM CANDIDATE:\n${userInstructions}\n` : ""}
Write the cover letter now:`;

    const result = await callPerplexity(systemPrompt, userPrompt, {
      model: "sonar",
      temperature: 0.7,
      timeout: 60_000,
    });

    if (isPerplexityError(result)) {
      throw new Error(`Cover letter generation failed: ${result.error}`);
    }

    const content = result.content.trim();
    if (!content || content.length < 100) {
      throw new Error("Generated cover letter is too short");
    }

    return {
      content,
      wordCount: content.split(/\s+/).length,
      type: "cover_letter",
    };
  },
};
