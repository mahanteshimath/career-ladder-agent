import { describe, it, expect, vi, beforeEach } from "vitest";

const callPerplexity = vi.fn();
vi.mock("@/lib/perplexity/client", () => ({
  callPerplexity: (...args: unknown[]) => callPerplexity(...args),
  isPerplexityError: (r: unknown) => typeof r === "object" && r !== null && "error" in r,
}));

import { searchScholarships } from "@/lib/agents/scholarship-researcher";

describe("searchScholarships", () => {
  beforeEach(() => callPerplexity.mockReset());

  it("normalizes a valid JSON array of scholarships", async () => {
    callPerplexity.mockResolvedValue({
      content: JSON.stringify([
        {
          name: "DAAD Scholarship",
          provider: "German Government",
          country: "Germany",
          level: "Masters",
          amount: "€992/month",
          eligibility: "Open to international students",
          deadline: "2026-10-31",
          source_url: "https://daad.de",
        },
        { name: "", provider: "Ignored — no name" },
      ]),
      citations: ["https://daad.de"],
    });

    const res = await searchScholarships("cv summary", "Masters", "Engineering", "Germany", "2026-07-12");
    expect("scholarships" in res).toBe(true);
    if ("scholarships" in res) {
      expect(res.scholarships).toHaveLength(1); // empty-name entry dropped
      expect(res.scholarships[0].name).toBe("DAAD Scholarship");
      expect(res.scholarships[0].amount).toBe("€992/month");
      expect(res.citations).toContain("https://daad.de");
    }
  });

  it("defaults missing fields safely", async () => {
    callPerplexity.mockResolvedValue({
      content: JSON.stringify([{ name: "Mystery Grant", provider: "" }]),
      citations: [],
    });
    const res = await searchScholarships("cv", "", "", "", "2026-07-12");
    if ("scholarships" in res) {
      const s = res.scholarships[0];
      expect(s.provider).toBe("Unknown");
      expect(s.country).toBe("Global");
      expect(s.amount).toBe("Varies");
      expect(s.deadline).toBe("Varies");
    } else {
      throw new Error("expected scholarships");
    }
  });

  it("returns error when Perplexity fails", async () => {
    callPerplexity.mockResolvedValue({ error: "network down" });
    const res = await searchScholarships("cv", "", "", "", "2026-07-12");
    expect("error" in res).toBe(true);
  });

  it("returns error when no valid entries parsed", async () => {
    callPerplexity.mockResolvedValue({ content: "[]", citations: [] });
    const res = await searchScholarships("cv", "", "", "", "2026-07-12");
    expect("error" in res).toBe(true);
  });
});
