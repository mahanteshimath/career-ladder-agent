import { describe, it, expect } from "vitest";
import { keywordCoverage } from "@/lib/utils/keyword-coverage";

describe("keywordCoverage", () => {
  it("returns empty when either side is missing", () => {
    expect(keywordCoverage(undefined, "Python role").coveragePct).toBe(0);
    expect(keywordCoverage("Python dev", undefined).jdKeywordCount).toBe(0);
  });

  it("scores only the skills the JD actually mentions", () => {
    const jd = "We need Python, React, and AWS experience for this backend role.";
    const cv = "Built services in Python and deployed on AWS.";
    const cov = keywordCoverage(cv, jd);
    expect(cov.jdKeywordCount).toBe(3); // Python, React, AWS
    expect(cov.matched).toEqual(expect.arrayContaining(["Python", "AWS"]));
    expect(cov.missing).toContain("React");
    expect(cov.coveragePct).toBe(67); // 2 of 3
  });

  it("handles punctuated skill tokens without partial matches", () => {
    const jd = "Strong Node.js and CI/CD skills required.";
    const cv = "Experienced with Node.js pipelines and CI/CD automation.";
    const cov = keywordCoverage(cv, jd);
    expect(cov.matched).toEqual(expect.arrayContaining(["Node.js", "CI/CD"]));
    expect(cov.coveragePct).toBe(100);
  });

  it("reports full gap when the CV covers none of the JD skills", () => {
    const cov = keywordCoverage("Marketing and sales background.", "Kubernetes and Terraform required.");
    expect(cov.jdKeywordCount).toBeGreaterThan(0);
    expect(cov.matched).toHaveLength(0);
    expect(cov.coveragePct).toBe(0);
  });
});
