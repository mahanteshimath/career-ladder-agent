import { describe, expect, it } from "vitest";
import { getSafeCallbackUrl } from "./callback-url";

const BASE_URL = "https://career-ladder-agent.vercel.app";

describe("getSafeCallbackUrl", () => {
  it("defaults to the dashboard when no callback is provided", () => {
    expect(getSafeCallbackUrl(null, BASE_URL)).toBe("/dashboard");
    expect(getSafeCallbackUrl(undefined, BASE_URL)).toBe("/dashboard");
    expect(getSafeCallbackUrl("", BASE_URL)).toBe("/dashboard");
  });

  it("allows same-origin absolute callback URLs", () => {
    expect(
      getSafeCallbackUrl(
        "https://career-ladder-agent.vercel.app/dashboard/generate?type=sop#draft",
        BASE_URL
      )
    ).toBe("/dashboard/generate?type=sop#draft");
  });

  it("allows relative callback URLs", () => {
    expect(getSafeCallbackUrl("/dashboard/upload", BASE_URL)).toBe("/dashboard/upload");
  });

  it("rejects external callback URLs", () => {
    expect(getSafeCallbackUrl("https://example.com/dashboard", BASE_URL)).toBe("/dashboard");
  });

  it("rejects invalid base URLs", () => {
    expect(getSafeCallbackUrl("/dashboard", "not-a-url")).toBe("/dashboard");
  });

  it("does not redirect to the site root after sign-in", () => {
    expect(getSafeCallbackUrl("/", BASE_URL)).toBe("/dashboard");
  });
});
