import { callPerplexity, isPerplexityError } from "@/lib/perplexity/client";
import { isPerplexityConfigured } from "@/lib/perplexity/config";
import { parseJsonResponse } from "@/lib/perplexity/json-utils";

export interface ParsedCv {
  name: string;
  email: string;
  phone?: string;
  summary: string;
  skills: string[];
  experience: {
    title: string;
    company: string;
    duration: string;
    highlights: string[];
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
    gpa?: string;
  }[];
  publications?: string[];
  certifications?: string[];
  keywords: string[];
}

const CV_PARSER_SYSTEM_PROMPT = `You are an expert CV/resume parser. Given the raw text of a CV, extract structured information and return ONLY valid JSON with these keys:
{
  "name": "Full name",
  "email": "Email address",
  "phone": "Phone number or null",
  "summary": "Professional summary (2-3 sentences)",
  "education": [
    {
      "degree": "Degree name",
      "institution": "University/College",
      "year": "Graduation year or expected",
      "gpa": "GPA if mentioned or null"
    }
  ],
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "duration": "Start - End",
      "highlights": ["achievement 1", "achievement 2"]
    }
  ],
  "skills": ["skill1", "skill2"],
  "publications": ["publication1"],
  "certifications": ["cert1"],
  "keywords": ["extracted", "relevant", "keywords", "for", "job", "matching"]
}
If a field is not found in the CV, use null or an empty list.
Return ONLY the JSON, no markdown formatting or explanation.`;

/**
 * CV Parser agent — extracts structured JSON from raw CV text.
 * Uses Perplexity API (like CareerMatch reference), with basic fallback.
 */
export const cvParser = {
  async parse(rawText: string): Promise<ParsedCv> {
    const truncatedText = rawText.slice(0, 15000);

    // Try Perplexity first (production path)
    if (isPerplexityConfigured()) {
      const result = await callPerplexity(
        CV_PARSER_SYSTEM_PROMPT,
        `Parse the following CV:\n\n${truncatedText}`,
        { model: "sonar", temperature: 0, timeout: 60_000 }
      );

      if (!isPerplexityError(result)) {
        const parsed = parseJsonResponse(result.content);
        if (parsed && parsed.length > 0 && typeof parsed[0] === "object" && parsed[0] !== null) {
          const cv = parsed[0] as Record<string, unknown>;
          return this.normalize(cv);
        }
      } else {
        console.warn("[cv-parser] Perplexity failed, using basic parser:", result.error);
      }
    }

    // Fallback: basic text extraction (no AI)
    return this.basicParse(truncatedText);
  },

  /**
   * Normalize a raw parsed object into the ParsedCv interface.
   */
  normalize(raw: Record<string, unknown>): ParsedCv {
    return {
      name: String(raw.name || "Unknown"),
      email: String(raw.email || ""),
      phone: raw.phone ? String(raw.phone) : undefined,
      summary: String(raw.summary || ""),
      skills: Array.isArray(raw.skills) ? raw.skills.map(String) : [],
      experience: Array.isArray(raw.experience)
        ? raw.experience.map((e: Record<string, unknown>) => ({
            title: String(e.title || ""),
            company: String(e.company || ""),
            duration: String(e.duration || ""),
            highlights: Array.isArray(e.highlights)
              ? e.highlights.map(String)
              : e.description
              ? [String(e.description)]
              : [],
          }))
        : [],
      education: Array.isArray(raw.education)
        ? raw.education.map((e: Record<string, unknown>) => ({
            degree: String(e.degree || ""),
            institution: String(e.institution || ""),
            year: String(e.year || ""),
            gpa: e.gpa ? String(e.gpa) : undefined,
          }))
        : [],
      publications: Array.isArray(raw.publications)
        ? raw.publications.map(String)
        : undefined,
      certifications: Array.isArray(raw.certifications)
        ? raw.certifications.map(String)
        : undefined,
      keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String) : [],
    };
  },

  /**
   * Basic regex/heuristic-based CV parser (fallback when no AI is available).
   */
  basicParse(text: string): ParsedCv {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    // Extract email
    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    const email = emailMatch?.[0] || "";

    // Extract phone
    const phoneMatch = text.match(/[\+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,}/);
    const phone = phoneMatch?.[0] || undefined;

    // Name: usually the first non-empty line
    const name = lines[0] || "Unknown";

    // Extract skills (common section headers)
    const skillsSection = this.extractSection(text, /skills|technical\s*skills|competencies/i);
    const skills = skillsSection
      ? skillsSection
          .split(/[,;|•·]|\n/)
          .map((s) => s.trim())
          .filter((s) => s.length > 1 && s.length < 50)
      : [];

    // Extract keywords from the full text
    const keywords = this.extractKeywords(text);

    return {
      name,
      email,
      phone,
      summary: lines.slice(1, 4).join(" ").slice(0, 300),
      skills: skills.slice(0, 30),
      experience: [],
      education: [],
      keywords,
    };
  },

  /**
   * Extract a section of text by heading pattern.
   */
  extractSection(text: string, headingPattern: RegExp): string | null {
    const lines = text.split("\n");
    let start = -1;
    for (let i = 0; i < lines.length; i++) {
      if (headingPattern.test(lines[i])) {
        start = i + 1;
        break;
      }
    }
    if (start === -1) return null;

    const endPatterns = /^(education|experience|projects|publications|certifications|references|awards|objective|summary)/i;
    let end = lines.length;
    for (let i = start; i < lines.length; i++) {
      if (endPatterns.test(lines[i].trim())) {
        end = i;
        break;
      }
    }
    return lines.slice(start, end).join("\n");
  },

  /**
   * Extract keywords from CV text for job matching.
   */
  extractKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s+#./-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const freq: Record<string, number> = {};
    const stopWords = new Set([
      "the", "and", "for", "with", "from", "that", "this", "have", "are",
      "was", "were", "been", "has", "its", "not", "but", "all", "can",
      "will", "also", "may", "any", "had", "did", "would", "could", "should",
      "who", "what", "when", "where", "which", "how", "their", "there", "here",
    ]);

    for (const w of words) {
      if (!stopWords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    }

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  },

  /**
   * Build a concise CV summary for use in SOP/cover letter generation.
   */
  buildSummary(parsed: ParsedCv): string {
    const skills = parsed.skills.slice(0, 10).join(", ");
    const latestExp = parsed.experience[0];
    const education = parsed.education[0];

    let summary = `${parsed.name}`;
    if (latestExp) {
      summary += ` — ${latestExp.title} at ${latestExp.company}`;
    }
    summary += `\nSkills: ${skills}`;
    if (education) {
      summary += `\nEducation: ${education.degree} from ${education.institution}`;
    }
    if (parsed.summary) {
      summary += `\nSummary: ${parsed.summary}`;
    }

    return summary;
  },
};
