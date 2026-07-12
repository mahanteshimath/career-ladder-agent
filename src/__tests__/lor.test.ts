import { describe, it, expect, vi, beforeEach } from "vitest";

const callPerplexity = vi.fn();
vi.mock("@/lib/perplexity/client", () => ({
  callPerplexity: (...args: unknown[]) => callPerplexity(...args),
  isPerplexityError: (r: unknown) => typeof r === "object" && r !== null && "error" in r,
}));

import { sopWriter } from "@/lib/agents/sop-writer";

function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
}

describe("sopWriter.generateLor", () => {
  beforeEach(() => callPerplexity.mockReset());

  it("returns letter content with an audit", async () => {
    callPerplexity.mockResolvedValue({
      content: `It is my pleasure to recommend Asha, whom I supervised at IIT Delhi where she improved model accuracy by 12%. ${words(430)}`,
      citations: [],
    });
    const doc = await sopWriter.generateLor("candidate profile", "Prof at IIT Delhi", "PhD at ETH");
    expect(doc.type).toBe("cover_letter");
    expect(doc.content.length).toBeGreaterThan(150);
    expect(doc.audit).toBeDefined();
    expect(typeof doc.audit.specificityScore).toBe("number");
  });

  it("throws when the letter is too short", async () => {
    callPerplexity.mockResolvedValue({ content: "too short", citations: [] });
    await expect(sopWriter.generateLor("cv", "ctx", "target")).rejects.toThrow(/too short/i);
  });

  it("throws when Perplexity errors", async () => {
    callPerplexity.mockResolvedValue({ error: "down" });
    await expect(sopWriter.generateLor("cv", "ctx", "target")).rejects.toThrow(/lor generation failed/i);
  });
});
