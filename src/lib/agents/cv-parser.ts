import { callPerplexity, isPerplexityError } from "@/lib/perplexity/client";
import { isPerplexityConfigured } from "@/lib/perplexity/config";
import { parseJsonResponse } from "@/lib/perplexity/json-utils";
import type { UserGoal, UserLevel, UserProfile } from "@/types";

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

/** Extended result including detected user profile */
export interface CvParseResult {
  cv: ParsedCv;
  detectedProfile: UserProfile;
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
  "keywords": ["extracted", "relevant", "keywords", "for", "job", "matching"],
  "profile": {
    "goal": "job | masters | phd | postdoc | undecided",
    "field": "Primary field/domain (e.g. computer_science, mechanical_engineering, data_science, business, biomedical, electrical_engineering)",
    "level": "fresh_grad | 1-2yr | 2-4yr | 4-6yr | 6-10yr | 10+yr",
    "geoPref": ["countries or regions mentioned or implied"],
    "researchInterests": ["research areas if academic, empty array if industry"]
  }
}
For the "profile" field, infer from the CV content:
- "goal": If they have publications/research → "phd" or "postdoc". If currently studying → "masters" or "job". If working professional → "job". Default to "undecided" if unclear.
- "field": The primary academic/professional domain.
- "level": "fresh_grad" if <1yr, "1-2yr" if 1-2 years, "2-4yr" if 2-4 years, "4-6yr" if 4-6 years, "6-10yr" if 6-10 years, "10+yr" if 10+ years.
- "geoPref": Countries/regions explicitly mentioned or implied by universities/companies.
- "researchInterests": Research topics if the person seems academic-oriented.
If a field is not found in the CV, use null or an empty list.
Return ONLY the JSON, no markdown formatting or explanation.`;

/**
 * CV Parser agent — extracts structured JSON from raw CV text.
 * Uses Perplexity API (like CareerMatch reference), with basic fallback.
 * Now also detects user profile (goal, field, level) from the CV content.
 */
export const cvParser = {
  async parse(rawText: string): Promise<CvParseResult> {
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
          const raw = parsed[0] as Record<string, unknown>;
          const cv = this.normalize(raw);
          const detectedProfile = this.extractProfile(raw, cv);
          return { cv, detectedProfile };
        } else {
          console.warn("[cv-parser] Perplexity returned content but JSON extraction failed. Content preview:", result.content.slice(0, 200));
        }
      } else {
        console.warn("[cv-parser] Perplexity failed, using basic parser:", result.error);
      }
    } else {
      console.warn("[cv-parser] Perplexity not configured, using basic parser");
    }

    // Fallback: basic text extraction (no AI)
    console.info("[cv-parser] Using basic fallback parser");
    const cv = this.basicParse(truncatedText);
    const detectedProfile = this.inferProfileFromCv(cv);
    return { cv, detectedProfile, usedFallback: true } as CvParseResult & { usedFallback: boolean };
  },

  /**
   * Extract the profile object from AI-parsed response.
   */
  extractProfile(raw: Record<string, unknown>, cv: ParsedCv): UserProfile {
    const profile = raw.profile as Record<string, unknown> | undefined;
    if (profile) {
      return {
        goal: this.validateGoal(String(profile.goal || "undecided")),
        field: String(profile.field || "general"),
        level: this.validateLevel(String(profile.level || "fresh_grad")),
        geoPref: Array.isArray(profile.geoPref) ? profile.geoPref.map(String) : undefined,
        researchInterests: Array.isArray(profile.researchInterests) ? profile.researchInterests.map(String) : undefined,
        detectedAt: new Date().toISOString(),
        confirmedByUser: false,
      };
    }
    // Fallback if AI didn't return profile
    return this.inferProfileFromCv(cv);
  },

  /**
   * Infer profile from parsed CV when AI profile is unavailable.
   */
  inferProfileFromCv(cv: ParsedCv): UserProfile {
    const hasPublications = (cv.publications?.length || 0) > 0;
    const experienceYears = cv.experience.length;
    const latestDegree = cv.education[0]?.degree?.toLowerCase() || "";
    
    let goal: UserGoal = "undecided";
    if (hasPublications && latestDegree.includes("ph")) goal = "postdoc";
    else if (hasPublications || latestDegree.includes("master")) goal = "phd";
    else if (experienceYears === 0) goal = "job";
    else goal = "job";

    let level: UserLevel = "fresh_grad";
    if (experienceYears >= 10) level = "10+yr";
    else if (experienceYears >= 6) level = "6-10yr";
    else if (experienceYears >= 4) level = "4-6yr";
    else if (experienceYears >= 2) level = "2-4yr";
    else if (experienceYears >= 1) level = "1-2yr";

    return {
      goal,
      field: "general",
      level,
      detectedAt: new Date().toISOString(),
      confirmedByUser: false,
    };
  },

  validateGoal(goal: string): UserGoal {
    const valid: UserGoal[] = ["job", "masters", "phd", "postdoc", "undecided"];
    return valid.includes(goal as UserGoal) ? (goal as UserGoal) : "undecided";
  },

  validateLevel(level: string): UserLevel {
    const valid: UserLevel[] = ["fresh_grad", "1-2yr", "2-4yr", "4-6yr", "6-10yr", "10+yr"];
    return valid.includes(level as UserLevel) ? (level as UserLevel) : "fresh_grad";
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
   * Extracts name, email, phone, skills, experience, education, and keywords.
   */
  basicParse(text: string): ParsedCv {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    // Extract email
    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    const email = emailMatch?.[0] || "";

    // Extract phone
    const phoneMatch = text.match(/[\+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,}/);
    const phone = phoneMatch?.[0] || undefined;

    // Name: usually the first non-empty line (skip if it looks like a section header)
    let name = "Unknown";
    for (const line of lines.slice(0, 5)) {
      if (!/^(resume|curriculum|cv|profile|summary|objective|contact)/i.test(line) && line.length > 1 && line.length < 60) {
        name = line;
        break;
      }
    }

    // Extract summary/objective
    const summarySection = this.extractSection(text, /summary|objective|profile|about\s*me/i);
    const summary = summarySection ? summarySection.split("\n").slice(0, 3).join(" ").slice(0, 300) : lines.slice(1, 4).join(" ").slice(0, 300);

    // Extract skills
    const skillsSection = this.extractSection(text, /skills|technical\s*skills|competencies|technologies/i);
    const skills = skillsSection
      ? skillsSection
          .split(/[,;|•·\-]|\n/)
          .map((s) => s.replace(/^\s*[-•·]\s*/, "").trim())
          .filter((s) => s.length > 1 && s.length < 60 && !/^\d+$/.test(s))
      : [];

    // Extract experience
    const experienceSection = this.extractSection(text, /experience|work\s*history|employment|professional\s*experience/i);
    const experience = this.parseExperienceSection(experienceSection || "");

    // Extract education
    const educationSection = this.extractSection(text, /education|academic|qualifications/i);
    const education = this.parseEducationSection(educationSection || "");

    // Extract publications
    const pubSection = this.extractSection(text, /publications|papers|research\s*papers/i);
    const publications = pubSection
      ? pubSection.split("\n").map((l) => l.trim()).filter((l) => l.length > 10).slice(0, 10)
      : undefined;

    // Extract certifications
    const certSection = this.extractSection(text, /certifications?|licenses?|credentials/i);
    const certifications = certSection
      ? certSection.split("\n").map((l) => l.replace(/^\s*[-•·]\s*/, "").trim()).filter((l) => l.length > 3 && l.length < 100).slice(0, 10)
      : undefined;

    // Extract keywords from the full text
    const keywords = this.extractKeywords(text);

    return {
      name,
      email,
      phone,
      summary,
      skills: skills.slice(0, 30),
      experience,
      education,
      publications,
      certifications,
      keywords,
    };
  },

  /**
   * Parse experience entries from a raw section.
   */
  parseExperienceSection(section: string): ParsedCv["experience"] {
    if (!section.trim()) return [];

    const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);
    const entries: ParsedCv["experience"] = [];
    let current: { title: string; company: string; duration: string; highlights: string[] } | null = null;

    // Patterns for dates: "Jan 2020 - Present", "2018 - 2022", "06/2019 - 12/2021"
    const datePattern = /(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*\d{4}\b|\b\d{4}\b|\bpresent\b|\bcurrent\b)/i;
    const durationPattern = /(\b(?:\d{1,2}[\/\-]\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*\d{4}|\d{4})\s*[-–—to]+\s*(?:\d{1,2}[\/\-]\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*\d{4}|\d{4}|present|current|till\s*date))/i;

    for (const line of lines) {
      const hasDuration = durationPattern.test(line);
      const isShortLine = line.length < 80;
      const looksLikeTitle = isShortLine && (hasDuration || /^[A-Z]/.test(line)) && !line.startsWith("•") && !line.startsWith("-");

      if (looksLikeTitle && (hasDuration || datePattern.test(line))) {
        // Save previous entry
        if (current) entries.push(current);

        const durationMatch = line.match(durationPattern);
        const duration = durationMatch?.[0] || "";
        const rest = line.replace(durationPattern, "").replace(/[|,]?\s*$/, "").trim();

        // Try to split "Title at Company" or "Title - Company" or "Title | Company"
        const parts = rest.split(/\s+(?:at|@|[-–—|])\s+/i);
        current = {
          title: (parts[0] || rest).trim(),
          company: (parts[1] || "").trim(),
          duration: duration.trim(),
          highlights: [],
        };
      } else if (current && (line.startsWith("•") || line.startsWith("-") || line.startsWith("*") || line.startsWith(">"))) {
        current.highlights.push(line.replace(/^[•\-*>\s]+/, "").trim());
      } else if (current && line.length > 20 && !looksLikeTitle) {
        // Treat as a highlight/description line
        current.highlights.push(line);
      }
    }
    if (current) entries.push(current);

    return entries.slice(0, 10);
  },

  /**
   * Parse education entries from a raw section.
   */
  parseEducationSection(section: string): ParsedCv["education"] {
    if (!section.trim()) return [];

    const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);
    const entries: ParsedCv["education"] = [];

    const degreePatterns = /\b(ph\.?d|m\.?tech|b\.?tech|m\.?s|b\.?s|m\.?sc|b\.?sc|mba|b\.?e|m\.?e|bachelor|master|doctor|diploma|b\.?com|m\.?com|b\.?a|m\.?a|b\.?eng|m\.?eng)\b/i;
    const yearPattern = /\b(19|20)\d{2}\b/;

    let current: { degree: string; institution: string; year: string; gpa?: string } | null = null;

    for (const line of lines) {
      if (degreePatterns.test(line) || (yearPattern.test(line) && line.length < 120)) {
        if (current) entries.push(current);

        const yearMatch = line.match(/\b((?:19|20)\d{2})\s*[-–—to]*\s*((?:19|20)\d{2}|present|current)?\b/i);
        const year = yearMatch ? (yearMatch[2] ? `${yearMatch[1]} - ${yearMatch[2]}` : yearMatch[1]) : "";
        const gpaMatch = line.match(/(?:gpa|cgpa|percentage|grade)[:\s]*([0-9.]+(?:\s*\/\s*[0-9.]+)?%?)/i);

        // Try to extract degree and institution
        const cleaned = line.replace(/\b(19|20)\d{2}\b/g, "").replace(/[-–—|,]\s*$/g, "").trim();
        const parts = cleaned.split(/\s*[-–—|,]\s+|\s+at\s+|\s+from\s+/i);

        current = {
          degree: (parts[0] || cleaned).trim(),
          institution: (parts[1] || "").trim(),
          year,
          gpa: gpaMatch?.[1] || undefined,
        };
      } else if (current && line.length > 5 && !current.institution) {
        current.institution = line;
      }
    }
    if (current) entries.push(current);

    return entries.slice(0, 5);
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
