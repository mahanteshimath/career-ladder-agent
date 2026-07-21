import { describe, it, expect } from "vitest";
import {
  classifySource,
  dedupeAndClean,
  sourceRank,
  toDomain,
} from "@/lib/utils/job-sources";

describe("classifySource", () => {
  it("classifies known ATS domains as 'ats'", () => {
    expect(classifySource("https://boards.greenhouse.io/acme/jobs/123")).toBe("ats");
    expect(classifySource("https://jobs.lever.co/acme/abc")).toBe("ats");
    expect(classifySource("https://acme.wd1.myworkdayjobs.com/careers/job/1")).toBe("ats");
    expect(classifySource("https://jobs.ashbyhq.com/acme/x")).toBe("ats");
  });

  it("classifies company career pages as 'official'", () => {
    expect(classifySource("https://careers.acme.com/job/1")).toBe("official");
    expect(classifySource("https://www.acme.com/careers/engineer")).toBe("official");
    expect(classifySource("https://acme.com/jobs/42")).toBe("official");
  });

  it("classifies aggregators / search engines as 'aggregator'", () => {
    expect(classifySource("https://www.linkedin.com/jobs/view/123")).toBe("aggregator");
    expect(classifySource("https://www.indeed.com/viewjob?jk=abc")).toBe("aggregator");
    expect(classifySource("https://www.google.com/search?q=jobs")).toBe("aggregator");
    expect(classifySource("https://www.naukri.com/job-listings-x")).toBe("aggregator");
  });

  it("classifies everything else as 'other' and handles bad input", () => {
    expect(classifySource("https://example.com/blog/post")).toBe("other");
    expect(classifySource("not a url")).toBe("other");
    expect(classifySource("")).toBe("other");
  });
});

describe("toDomain", () => {
  it("strips protocol, www, path, and query", () => {
    expect(toDomain("https://www.Acme.com/careers?x=1")).toBe("acme.com");
    expect(toDomain("careers.acme.com")).toBe("careers.acme.com");
  });

  it("returns empty for invalid domains", () => {
    expect(toDomain("")).toBe("");
    expect(toDomain("localhost")).toBe("");
  });
});

describe("dedupeAndClean", () => {
  it("removes duplicate URLs and drops aggregator links", () => {
    const jobs = [
      { title: "A", company: "X", sourceUrl: "https://boards.greenhouse.io/x/1" },
      { title: "A", company: "X", sourceUrl: "https://boards.greenhouse.io/x/1" }, // dup
      { title: "B", company: "Y", sourceUrl: "https://www.linkedin.com/jobs/2" }, // aggregator
      { title: "C", company: "Z", sourceUrl: "https://careers.z.com/3" },
    ];
    const out = dedupeAndClean(jobs);
    expect(out).toHaveLength(2);
    expect(out.map((j) => j.title)).toEqual(["A", "C"]);
  });
});

describe("sourceRank", () => {
  it("ranks verified ATS above unverified official above other", () => {
    const atsVerified = { sourceUrl: "https://boards.greenhouse.io/x/1", verified: true };
    const officialUnverified = { sourceUrl: "https://careers.z.com/3", verified: false };
    const other = { sourceUrl: "https://example.com/blog", verified: false };
    expect(sourceRank(atsVerified)).toBeGreaterThan(sourceRank(officialUnverified));
    expect(sourceRank(officialUnverified)).toBeGreaterThan(sourceRank(other));
  });
});
