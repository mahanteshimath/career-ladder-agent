import { callPerplexity, isPerplexityError } from "@/lib/perplexity/client";
import { GROUNDING_RULE, TRUST_BOUNDARY } from "@/lib/agents/safety";

export interface DocumentAudit {
  /** 0-100 heuristic score: higher = more specific/concrete, fewer clichés. */
  specificityScore: number;
  /** Generic/cliché phrases detected in the document. */
  bannedPhrases: string[];
  /** Unfilled placeholders detected (e.g. "[Company Name]", "your company"). */
  placeholders: string[];
  /** Whether the word count falls within the target range for the doc type. */
  withinTargetLength: boolean;
  /** Human-readable, actionable improvement suggestions. */
  suggestions: string[];
}

export interface GeneratedDocument {
  content: string;
  wordCount: number;
  type: "sop" | "cover_letter";
  audit: DocumentAudit;
}

/** Target word-count ranges per document type. */
const TARGET_LENGTH: Record<GeneratedDocument["type"], { min: number; max: number }> = {
  sop: { min: 800, max: 1200 },
  cover_letter: { min: 400, max: 600 },
};

/** Generic clichés that weaken an SOP or cover letter. Case-insensitive. */
const BANNED_PHRASES: string[] = [
  "i am writing to express",
  "i am writing to apply",
  "since a young age",
  "from a young age",
  "for as long as i can remember",
  "hardworking",
  "hard-working",
  "team player",
  "think outside the box",
  "hit the ground running",
  "results-driven",
  "results driven",
  "detail-oriented",
  "detail oriented",
  "self-starter",
  "go-getter",
  "dynamic environment",
  "fast-paced environment",
  "wide range of",
  "passion for",
  "passionate about",
  "i have always been interested",
  "i believe i would be a great fit",
  "perfect candidate",
  "utilize my skills",
  "esteemed institution",
  "esteemed university",
  "world-class",
  "cutting-edge",
  "make a difference",
  "valuable asset",
];

/** Placeholder patterns indicating the document was not fully tailored. */
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\[[^\]]+\]/g, // [Company Name], [Position], etc.
  /\byour company\b/gi,
  /\bthe company\b/gi,
  /\byour organization\b/gi,
  /\bXYZ\b/g,
  /\b(insert|add|enter)\s+\w+\s+(here|name)\b/gi,
];

/**
 * Deterministic, offline quality audit of a generated document.
 * No LLM call — pure heuristics so it is fast, free, and unit-testable.
 */
export function auditDocument(
  content: string,
  type: GeneratedDocument["type"]
): DocumentAudit {
  const text = content.trim();
  const lower = text.toLowerCase();
  const wordCount = text ? text.split(/\s+/).length : 0;

  const bannedPhrases = BANNED_PHRASES.filter((phrase) => lower.includes(phrase));

  const placeholders = Array.from(
    new Set(
      PLACEHOLDER_PATTERNS.flatMap((re) => text.match(re) ?? []).map((m) => m.trim())
    )
  );

  // Concrete-signal detectors that indicate specificity.
  const numericMatches = text.match(/\b\d[\d,.]*%?\b/g) ?? [];
  // Proper nouns: two+ consecutive capitalized words (e.g. "MIT Media Lab").
  const properNounMatches = text.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)+)\b/g) ?? [];

  const target = TARGET_LENGTH[type];
  const withinTargetLength = wordCount >= target.min && wordCount <= target.max;

  // Score: start at 60, reward concreteness, penalize clichés/placeholders/length.
  let score = 60;
  score += Math.min(24, numericMatches.length * 6); // metrics
  score += Math.min(25, properNounMatches.length * 5); // named specifics
  score -= bannedPhrases.length * 8;
  score -= placeholders.length * 10;
  if (!withinTargetLength) score -= 10;
  const specificityScore = Math.max(0, Math.min(100, Math.round(score)));

  const suggestions: string[] = [];
  if (bannedPhrases.length > 0) {
    suggestions.push(
      `Remove ${bannedPhrases.length} generic phrase${bannedPhrases.length > 1 ? "s" : ""}: ${bannedPhrases
        .slice(0, 5)
        .join(", ")}.`
    );
  }
  if (placeholders.length > 0) {
    suggestions.push(
      `Fill in ${placeholders.length} placeholder${placeholders.length > 1 ? "s" : ""}: ${placeholders
        .slice(0, 5)
        .join(", ")}.`
    );
  }
  if (numericMatches.length === 0) {
    suggestions.push("Add quantified impact (numbers, %, or metrics) to strengthen credibility.");
  }
  if (properNounMatches.length < 2) {
    suggestions.push(
      "Name specific people, labs, projects, or courses to show genuine, tailored research."
    );
  }
  if (!withinTargetLength) {
    suggestions.push(
      wordCount < target.min
        ? `Too short — aim for ${target.min}-${target.max} words (currently ${wordCount}).`
        : `Too long — aim for ${target.min}-${target.max} words (currently ${wordCount}).`
    );
  }
  if (suggestions.length === 0) {
    suggestions.push("Looks specific and concrete. Do a final read for your authentic voice.");
  }

  return { specificityScore, bannedPhrases, placeholders, withinTargetLength, suggestions };
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
    const systemPrompt = `${TRUST_BOUNDARY}

${GROUNDING_RULE}

You are an expert academic writing assistant. Write a Statement of Purpose (SOP) for a graduate/faculty position application.

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
      audit: auditDocument(content, "sop"),
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
    const systemPrompt = `${TRUST_BOUNDARY}

${GROUNDING_RULE}

You are an expert career coach and professional writer. Write a cover letter for a job application.

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
      audit: auditDocument(content, "cover_letter"),
    };
  },

  /**
   * Generate a personalized cold-outreach email to a professor/supervisor
   * for an academic position. Returns a subject + body. Never fabricates.
   */
  async generateOutreachEmail(
    cvSummary: string,
    positionContext: string,
    professorName?: string,
    userInstructions?: string
  ): Promise<OutreachEmail> {
    const systemPrompt = `${TRUST_BOUNDARY}

${GROUNDING_RULE}

You are an expert academic writing assistant helping a prospective student email a professor about a research position.

REQUIREMENTS:
- Write a concise, specific cold email (120-200 words in the body).
- Show genuine knowledge of the professor's research and connect it to the candidate's background.
- Structure: brief intro → why this lab/research specifically → 1-2 concrete qualifications → clear ask (availability, funding) → polite close.
- Professional, respectful, non-generic tone. No flattery clichés.
- Do NOT fabricate publications, grades, or the professor's work. Only use provided profile details.
- Return ONLY valid JSON: {"subject": "...", "body": "..."}. No markdown, no commentary.`;

    const userPrompt = `CANDIDATE PROFILE:
${cvSummary}

TARGET POSITION / LAB:
${positionContext}
${professorName ? `\nPROFESSOR: ${professorName}` : ""}
${userInstructions ? `\nADDITIONAL INSTRUCTIONS:\n${userInstructions}` : ""}

Write the outreach email as JSON now:`;

    const result = await callPerplexity(systemPrompt, userPrompt, {
      model: "sonar",
      temperature: 0.6,
      timeout: 60_000,
    });

    if (isPerplexityError(result)) {
      throw new Error(`Outreach email generation failed: ${result.error}`);
    }

    const parsed = parseOutreachJson(result.content);
    if (!parsed.body || parsed.body.length < 40) {
      throw new Error("Generated outreach email is too short");
    }

    return {
      subject: parsed.subject || "Prospective student interested in your research",
      body: parsed.body,
      wordCount: parsed.body.split(/\s+/).length,
    };
  },

  /**
   * Draft a Letter of Recommendation (LOR). Common in Indian academia where a
   * student prepares a draft for a professor to review and sign. Written from
   * the recommender's perspective. Never fabricates achievements.
   */
  async generateLor(
    candidateProfile: string,
    recommenderContext: string,
    targetContext: string,
    userInstructions?: string
  ): Promise<GeneratedDocument> {
    const systemPrompt = `${TRUST_BOUNDARY}

${GROUNDING_RULE}

You are an expert academic writing assistant drafting a Letter of Recommendation (LOR) written FROM THE RECOMMENDER'S perspective about a candidate.

REQUIREMENTS:
- Write 400-600 words in a formal, credible, third-person recommending tone.
- Structure: recommender's relationship to candidate → 2-3 specific strengths with concrete examples → comparison/standing → strong endorsement → closing with contact offer.
- Use ONLY facts present in the candidate profile and recommender context. Do NOT invent achievements, grades, rankings, or projects.
- Leave the recommender's signature block generic if details are missing (do not fabricate a name/title).
- Return ONLY the letter text, no commentary.`;

    const userPrompt = `CANDIDATE PROFILE:
${candidateProfile}

RECOMMENDER CONTEXT (who is writing, relationship, how long/known):
${recommenderContext}

TARGET PROGRAM / ROLE:
${targetContext}

${userInstructions ? `ADDITIONAL INSTRUCTIONS:\n${userInstructions}\n` : ""}
Write the letter of recommendation now:`;

    const result = await callPerplexity(systemPrompt, userPrompt, {
      model: "sonar",
      temperature: 0.6,
      timeout: 60_000,
    });

    if (isPerplexityError(result)) {
      throw new Error(`LOR generation failed: ${result.error}`);
    }

    const content = result.content.trim();
    if (!content || content.length < 150) {
      throw new Error("Generated letter is too short");
    }

    return {
      content,
      wordCount: content.split(/\s+/).length,
      type: "cover_letter",
      audit: auditDocument(content, "cover_letter"),
    };
  },
};

export interface OutreachEmail {
  subject: string;
  body: string;
  wordCount: number;
}

/** Best-effort parse of the model's JSON email response with plain-text fallback. */
function parseOutreachJson(raw: string): { subject: string; body: string } {
  const text = raw.trim();
  // Strip markdown fences if present.
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const obj = JSON.parse(cleaned.slice(start, end + 1));
      return {
        subject: typeof obj.subject === "string" ? obj.subject.trim() : "",
        body: typeof obj.body === "string" ? obj.body.trim() : "",
      };
    }
  } catch {
    // fall through to plain-text handling
  }
  // Fallback: treat the whole response as the body.
  return { subject: "", body: cleaned };
}
