/**
 * E2E / integration tests for the reviewer-feedback changes.
 *
 * Run individually, e.g.:
 *   npx vitest run src/__tests__/reviewer-feedback.test.ts -t "mergeResults"
 *   npx vitest run src/__tests__/reviewer-feedback.test.ts -t "lab insights"
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import { buildCvSummary } from "@/lib/utils/cv-summary";
import { mergeResults } from "@/lib/agents/job-matcher";
import { normalizeLabInsights, fallbackInsights } from "@/lib/agents/lab-researcher";
import { TIER_LIMITS, UPCOMING_TIERS } from "@/config/tiers";
import { CV_TEMPLATES } from "@/config/cv-templates";

// ─── 1. CV summary builder (Evaluate accuracy fix) ──────────────────────────

describe("buildCvSummary", () => {
  const parsed = {
    name: "Asha Rao",
    skills: ["python", "genomics", "ngs", "statistics"],
    experience: [
      { title: "Bioinformatics Analyst", company: "MedGenome", duration: "2021-2024", highlights: [] },
    ],
    education: [{ degree: "M.Sc Bioinformatics", institution: "University of Hyderabad", year: "2021" }],
    publications: ["Paper A", "Paper B"],
    summary: "Bioinformatician with NGS pipeline experience.",
    keywords: ["bioinformatics", "genomics"],
  };

  it("returns empty string for null / undefined / non-object", () => {
    expect(buildCvSummary(null)).toBe("");
    expect(buildCvSummary(undefined)).toBe("");
    expect(buildCvSummary("not an object" as unknown as Record<string, unknown>)).toBe("");
  });

  it("includes name, skills, experience, education, publications, summary, keywords", () => {
    const out = buildCvSummary(parsed);
    expect(out).toContain("Name: Asha Rao");
    expect(out).toContain("Skills: python, genomics, ngs, statistics");
    expect(out).toContain("Bioinformatics Analyst at MedGenome (2021-2024)");
    expect(out).toContain("M.Sc Bioinformatics from University of Hyderabad 2021");
    expect(out).toContain("Publications: 2 listed");
    expect(out).toContain("Summary: Bioinformatician");
    expect(out).toContain("Keywords: bioinformatics, genomics");
  });

  it("caps skills to 25 entries", () => {
    const many = { skills: Array.from({ length: 40 }, (_, i) => `s${i}`) };
    const out = buildCvSummary(many);
    expect(out).toContain("s24");
    expect(out).not.toContain("s25");
  });

  it("truncates the summary to 4000 characters", () => {
    const out = buildCvSummary({ summary: "x".repeat(5000) });
    expect(out.length).toBeLessThanOrEqual(4000);
  });
});

// ─── 2. Job matcher relevance ranking (only-AI/ML + mixing fix) ──────────────

describe("job matcher mergeResults", () => {
  it("ranks keyword rows by MATCH_SCORE relevance (not insertion order)", () => {
    const rows = [
      { ID: "low", TITLE: "Low", COMPANY: "X", MATCH_SCORE: 3 },
      { ID: "high", TITLE: "High", COMPANY: "Y", MATCH_SCORE: 9 },
    ];
    const res = mergeResults(rows, [], "job");
    expect(res[0].id).toBe("high");
    expect(res[0].score).toBeGreaterThan(res[1].score);
  });

  it("keeps keyword-only scores within the 0.35–0.75 band", () => {
    const rows = [
      { ID: "a", TITLE: "A", COMPANY: "X", MATCH_SCORE: 9 },
      { ID: "b", TITLE: "B", COMPANY: "Y", MATCH_SCORE: 1 },
    ];
    const res = mergeResults(rows, [], "job");
    for (const r of res) {
      expect(r.score).toBeGreaterThanOrEqual(0.35);
      expect(r.score).toBeLessThanOrEqual(0.75);
    }
  });

  it("boosts score and marks 'hybrid' when found by both methods", () => {
    const rows = [{ ID: "a", TITLE: "A", COMPANY: "X", MATCH_SCORE: 5 }];
    const res = mergeResults(rows, [{ id: "a", score: 0.8, title: "A" }], "job");
    expect(res[0].matchMethod).toBe("hybrid");
    expect(res[0].score).toBeGreaterThan(0.75);
  });

  it("adds semantic-only results", () => {
    const res = mergeResults([], [{ id: "s", score: 0.9, title: "S" }], "position");
    expect(res).toHaveLength(1);
    expect(res[0].matchMethod).toBe("semantic");
  });

  it("uses UNIVERSITY as organization for positions and COMPANY for jobs", () => {
    const posRes = mergeResults([{ ID: "p", TITLE: "P", UNIVERSITY: "IISc", MATCH_SCORE: 3 }], [], "position");
    expect(posRes[0].organization).toBe("IISc");
    const jobRes = mergeResults([{ ID: "j", TITLE: "J", COMPANY: "Infosys", MATCH_SCORE: 3 }], [], "job");
    expect(jobRes[0].organization).toBe("Infosys");
  });

  it("returns an empty array when there are no inputs", () => {
    expect(mergeResults([], [], "job")).toEqual([]);
  });
});

// ─── 3. Lab insights normalization (new feature) ────────────────────────────

describe("lab insights normalization", () => {
  it("coerces missing fields to 'Not available' and empty faculty", () => {
    const out = normalizeLabInsights({ summary: "A great lab." }, "IIT Bombay", "CS");
    expect(out.university).toBe("IIT Bombay");
    expect(out.department).toBe("CS");
    expect(out.summary).toBe("A great lab.");
    expect(out.qsRanking).toBe("Not available");
    expect(out.alumniDestinations).toBe("Not available");
    expect(out.notableFaculty).toEqual([]);
  });

  it("filters out empty faculty entries and keeps citations", () => {
    const out = normalizeLabInsights(
      { notableFaculty: ["Prof. A", "", "   ", "Prof. B"] },
      "MIT",
      "Physics",
      ["https://mit.edu/a", ""]
    );
    expect(out.notableFaculty).toEqual(["Prof. A", "Prof. B"]);
    expect(out.citations).toEqual(["https://mit.edu/a"]);
  });

  it("fallbackInsights returns safe placeholders", () => {
    const fb = fallbackInsights("Stanford", "Bioengineering");
    expect(fb.university).toBe("Stanford");
    expect(fb.qsRanking).toBe("Not available");
    expect(fb.notableFaculty).toEqual([]);
    expect(fb.citations).toEqual([]);
  });
});

// ─── 4. Pricing / tier changes (reviewer editorial feedback) ────────────────

describe("pricing tiers", () => {
  it("Basic plan is a fixed ₹75 (no range)", () => {
    expect(TIER_LIMITS.basic.price).toBe("₹75");
    expect(TIER_LIMITS.basic.priceSubtext).toBe("per week");
  });

  it("Premium no longer advertises email support", () => {
    expect(TIER_LIMITS.premium.features).not.toContain("Email support");
  });

  it("exposes a ₹899 coming-soon mentor tier", () => {
    const mentor = UPCOMING_TIERS.find((t) => t.name === "mentor");
    expect(mentor).toBeDefined();
    expect(mentor?.price).toBe("₹899");
    expect(mentor?.comingSoon).toBe(true);
    expect(mentor?.features.some((f) => /mentor session/i.test(f))).toBe(true);
  });
});

// ─── 5. CV templates (removed Creative Bold) ────────────────────────────────

describe("cv templates", () => {
  it("no longer includes the Creative Bold template", () => {
    expect(CV_TEMPLATES.some((t) => t.id === "creative-bold")).toBe(false);
    expect(CV_TEMPLATES.some((t) => t.name === "Creative Bold")).toBe(false);
  });
});

// ─── 6. Evaluator anti-fabrication guardrail (Evaluate accuracy) ────────────

describe("evaluator anti-fabrication guardrail", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function runWith(inputType: "url" | "text") {
    vi.doMock("@/lib/perplexity/config", () => ({
      isPerplexityConfigured: () => true,
      PERPLEXITY_API_URL: "https://mock.api",
      PERPLEXITY_MODEL: "sonar",
      PERPLEXITY_TIMEOUT: 5000,
      PERPLEXITY_MAX_RETRIES: 0,
      isRetryableStatus: () => false,
      getPerplexityApiKey: () => "test-key",
    }));

    const captured: { userMessage: string } = { userMessage: "" };
    vi.doMock("@/lib/perplexity/client", () => ({
      callPerplexity: vi.fn(async (_sys: string, user: string) => {
        captured.userMessage = user;
        return {
          content: '{"overallScore":0.5,"recommendation":"good_match","blocks":[]}',
          citations: [],
        };
      }),
      isPerplexityError: () => false,
    }));

    const { evaluator } = await import("@/lib/agents/job-evaluator");
    await evaluator.evaluate("https://example.com/job", inputType, "CV summary here", "job");
    return captured.userMessage;
  }

  it("instructs the model not to invent details", async () => {
    const msg = await runWith("text");
    expect(msg).toContain("Do NOT invent");
  });

  it("adds a URL-access caveat for URL input", async () => {
    const msg = await runWith("url");
    expect(msg).toContain("cannot access the URL");
  });
});

// ─── 7. Lab researcher orchestration (fallback + success paths) ─────────────

describe("lab researcher", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns fallback insights when Perplexity is not configured", async () => {
    vi.doMock("@/lib/perplexity/config", () => ({
      isPerplexityConfigured: () => false,
      getPerplexityApiKey: () => { throw new Error("No key"); },
    }));
    vi.doMock("@/lib/perplexity/client", () => ({
      callPerplexity: vi.fn(),
      isPerplexityError: () => false,
    }));

    const { researchLab } = await import("@/lib/agents/lab-researcher");
    const res = await researchLab("IIT Bombay", "Computer Science");
    expect(res.university).toBe("IIT Bombay");
    expect(res.qsRanking).toBe("Not available");
  });

  it("normalizes a successful research response", async () => {
    vi.doMock("@/lib/perplexity/config", () => ({
      isPerplexityConfigured: () => true,
      getPerplexityApiKey: () => "test-key",
    }));
    vi.doMock("@/lib/perplexity/client", () => ({
      callPerplexity: vi.fn(async () => ({
        content: JSON.stringify({
          summary: "Leading ML lab.",
          qsRanking: "QS World #172",
          researchOutput: "20 papers/year",
          labEnvironment: "Collaborative, 15 members",
          ethicalPractice: "Strong wellbeing policy",
          alumniDestinations: "Faculty roles and FAANG",
          notableFaculty: ["Prof. X"],
        }),
        citations: ["https://iitb.ac.in/lab"],
      })),
      isPerplexityError: () => false,
    }));

    const { researchLab } = await import("@/lib/agents/lab-researcher");
    const res = await researchLab("IIT Bombay", "Computer Science", "Machine Learning");
    expect(res.summary).toBe("Leading ML lab.");
    expect(res.qsRanking).toBe("QS World #172");
    expect(res.notableFaculty).toEqual(["Prof. X"]);
    expect(res.citations).toEqual(["https://iitb.ac.in/lab"]);
  });
});
