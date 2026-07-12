import { describe, it, expect, vi, beforeEach } from "vitest";

const callPerplexity = vi.fn();
vi.mock("@/lib/perplexity/client", () => ({
  callPerplexity: (...args: unknown[]) => callPerplexity(...args),
  isPerplexityError: (r: unknown) => typeof r === "object" && r !== null && "error" in r,
}));

import { generateInterviewPrep } from "@/lib/agents/interview-coach";

describe("generateInterviewPrep", () => {
  beforeEach(() => callPerplexity.mockReset());

  it("parses questions and tips", async () => {
    callPerplexity.mockResolvedValue({
      content: JSON.stringify({
        questions: [
          { question: "Tell me about a hard bug you fixed.", category: "behavioral", suggestedPoints: ["STAR format", "quantify impact"] },
          { question: "Explain gradient descent.", category: "technical", suggestedPoints: ["intuition first"] },
          { question: "", category: "technical", suggestedPoints: [] },
        ],
        tips: ["Research the team", "Prepare 2 questions to ask", ""],
      }),
      citations: [],
    });

    const prep = await generateInterviewPrep("cv summary", "Backend engineer", "job");
    expect(prep.questions).toHaveLength(2); // empty question dropped
    expect(prep.questions[0].category).toBe("behavioral");
    expect(prep.tips).toEqual(["Research the team", "Prepare 2 questions to ask"]);
  });

  it("defaults category to 'general' when missing", async () => {
    callPerplexity.mockResolvedValue({
      content: JSON.stringify({ questions: [{ question: "Why us?" }], tips: [] }),
      citations: [],
    });
    const prep = await generateInterviewPrep("cv", "", "academic");
    expect(prep.questions[0].category).toBe("general");
    expect(prep.questions[0].suggestedPoints).toEqual([]);
  });

  it("throws when no valid questions are returned", async () => {
    callPerplexity.mockResolvedValue({ content: JSON.stringify({ questions: [], tips: [] }), citations: [] });
    await expect(generateInterviewPrep("cv", "", "job")).rejects.toThrow(/no valid questions/i);
  });

  it("throws when Perplexity errors", async () => {
    callPerplexity.mockResolvedValue({ error: "boom" });
    await expect(generateInterviewPrep("cv", "", "job")).rejects.toThrow(/interview prep generation failed/i);
  });
});
