import { callPerplexity, isPerplexityError } from "@/lib/perplexity/client";
import { parseJsonResponse } from "@/lib/perplexity/json-utils";

export interface EnhancedCvSections {
  summary: string;
  experience: { title: string; company: string; highlights: string[] }[];
  skills: string[];
}

/**
 * CV Enhancer agent — improves CV bullet points, suggests skills, fixes grammar.
 */
export const cvEnhancer = {
  async enhance(
    rawSummary: string,
    experience: { title: string; company: string; highlights: string[] }[],
    skills: string[],
    targetRole?: string
  ): Promise<EnhancedCvSections> {
    const systemPrompt = `You are an expert resume/CV writer. Enhance CV content to be more impactful, professional, and ATS-friendly.

INSTRUCTIONS:
1. Rewrite the summary to be compelling and concise (2-3 sentences max)
2. Improve each bullet point: start with strong action verbs, quantify impact where possible, keep concise
3. Suggest 3-5 additional relevant skills the candidate likely has based on their experience
4. Do NOT fabricate achievements — only improve wording of existing ones

Return your response in this exact JSON format:
{
  "summary": "improved summary",
  "experience": [{"title": "...", "company": "...", "highlights": ["improved bullet 1", "improved bullet 2"]}],
  "skills": ["all original skills", "plus suggested ones"]
}

Return ONLY valid JSON, no other text.`;

    const userPrompt = `ORIGINAL SUMMARY:
${rawSummary}

EXPERIENCE:
${experience.map((e) => `${e.title} at ${e.company}:\n${e.highlights.map((h) => `- ${h}`).join("\n")}`).join("\n\n")}

SKILLS:
${skills.join(", ")}

${targetRole ? `TARGET ROLE: ${targetRole}\n` : ""}
Enhance and return JSON:`;

    const result = await callPerplexity(systemPrompt, userPrompt, {
      model: "sonar",
      temperature: 0.5,
      timeout: 45_000,
    });

    if (isPerplexityError(result)) {
      // Fallback: return original content if AI fails
      return { summary: rawSummary, experience, skills };
    }

    try {
      const parsed = parseJsonResponse(result.content);
      if (!parsed || parsed.length === 0) throw new Error("No JSON found");
      return parsed[0] as EnhancedCvSections;
    } catch {
      return { summary: rawSummary, experience, skills };
    }
  },
};
