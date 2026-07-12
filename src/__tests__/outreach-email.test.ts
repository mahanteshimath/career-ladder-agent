import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Perplexity client so no network call is made.
const callPerplexity = vi.fn();
vi.mock("@/lib/perplexity/client", () => ({
  callPerplexity: (...args: unknown[]) => callPerplexity(...args),
  isPerplexityError: (r: unknown) => typeof r === "object" && r !== null && "error" in r,
}));

import { sopWriter } from "@/lib/agents/sop-writer";

describe("sopWriter.generateOutreachEmail", () => {
  beforeEach(() => callPerplexity.mockReset());

  it("parses a JSON subject + body response", async () => {
    callPerplexity.mockResolvedValue({
      content: JSON.stringify({
        subject: "Prospective PhD student — sparse transformers",
        body: "Dear Prof. Chen, I am a final-year student who built an attention-optimization system that reduced latency by 30%. Your lab's work on sparse transformers aligns closely with my research. I would be grateful to learn whether you are accepting students for Fall 2027 and whether funding is available. Thank you for your time.",
      }),
      citations: [],
    });

    const email = await sopWriter.generateOutreachEmail(
      "CV summary here",
      "Title: PhD in ML\nUniversity: MIT",
      "Dr. Chen"
    );

    expect(email.subject).toMatch(/sparse transformers/i);
    expect(email.body).toMatch(/Prof\. Chen/);
    expect(email.wordCount).toBeGreaterThan(20);
  });

  it("falls back to plain text when response is not JSON", async () => {
    callPerplexity.mockResolvedValue({
      content: "Dear Professor, I am writing regarding your research on photonics and would love to discuss a potential PhD position in your lab this coming cycle.",
      citations: [],
    });

    const email = await sopWriter.generateOutreachEmail("cv", "position ctx");
    expect(email.body).toMatch(/photonics/);
    expect(email.subject.length).toBeGreaterThan(0); // default subject applied
  });

  it("throws when the generated body is too short", async () => {
    callPerplexity.mockResolvedValue({
      content: JSON.stringify({ subject: "Hi", body: "too short" }),
      citations: [],
    });

    await expect(
      sopWriter.generateOutreachEmail("cv", "position ctx")
    ).rejects.toThrow(/too short/i);
  });

  it("throws when the Perplexity call errors", async () => {
    callPerplexity.mockResolvedValue({ error: "rate limited" });
    await expect(
      sopWriter.generateOutreachEmail("cv", "position ctx")
    ).rejects.toThrow(/outreach email generation failed/i);
  });
});
