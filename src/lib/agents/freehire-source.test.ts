import { describe, it, expect } from "vitest";
import { mapFreehireJobs, filterByLocationHint } from "@/lib/agents/freehire-source";

describe("mapFreehireJobs", () => {
  it("maps a freehire job to the ResearchedJob contract", () => {
    const [job] = mapFreehireJobs([
      {
        url: "https://job-boards.greenhouse.io/roku/jobs/7955995",
        title: "Machine Learning Engineer",
        company: "Roku",
        location: "Bengaluru, India",
        description: "<p>Build <strong>ML</strong> systems.</p>",
        skills: ["machine-learning", "python", "deep-learning"],
        countries: ["in"],
        cities: ["Bengaluru"],
        closed_at: null,
        enrichment: { salary_min: 100000, salary_max: 150000, salary_currency: "USD" },
      },
    ]);
    expect(job.title).toBe("Machine Learning Engineer");
    expect(job.company).toBe("Roku");
    expect(job.location).toBe("Bengaluru, India");
    expect(job.sourceUrl).toContain("greenhouse.io");
    expect(job.requiredSkills).toContain("machine learning");
    expect(job.description).not.toContain("<");
    expect(job.salaryRange).toBe("USD 100000-150000");
  });

  it("skips closed and malformed jobs", () => {
    const out = mapFreehireJobs([
      { url: "https://x.com/1", title: "Open", closed_at: null },
      { url: "https://x.com/2", title: "Closed", closed_at: "2026-01-01" },
      { url: "", title: "No URL", closed_at: null },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("Open");
  });
});

describe("filterByLocationHint", () => {
  const jobs = [
    { title: "A", company: "X", location: "Bengaluru, India", description: "", requiredSkills: [], experienceLevel: "", salaryRange: "", sourceUrl: "u1" },
    { title: "B", company: "Y", location: "Seattle, United States", description: "", requiredSkills: [], experienceLevel: "", salaryRange: "", sourceUrl: "u2" },
  ];

  it("keeps only jobs matching a requested city", () => {
    const out = filterByLocationHint(jobs, "Bengaluru and Pune DATA/AI Leadership roles");
    expect(out.map((j) => j.title)).toEqual(["A"]);
  });

  it("keeps everything when no place token is present", () => {
    expect(filterByLocationHint(jobs, "remote data roles")).toHaveLength(2);
    expect(filterByLocationHint(jobs, "")).toHaveLength(2);
  });
});
