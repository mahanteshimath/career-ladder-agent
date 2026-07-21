import { describe, it, expect, vi, beforeEach } from "vitest";

const executeQuery = vi.fn();
vi.mock("@/lib/snowflake/client", () => ({
  executeQuery: (...args: unknown[]) => executeQuery(...args),
}));

import { submitIssue } from "@/lib/snowflake/queries";

describe("submitIssue", () => {
  beforeEach(() => executeQuery.mockReset());

  it("inserts an issue with the attachment column", async () => {
    executeQuery.mockResolvedValue({ rows: [] });
    await submitIssue({ userId: "u1", category: "bug", description: "x".repeat(20), attachment: null });
    expect(executeQuery).toHaveBeenCalledTimes(1);
    expect(executeQuery.mock.calls[0][0]).toMatch(/INSERT INTO CL_ISSUES/);
  });

  it("self-heals when the ATTACHMENT column is missing, then retries", async () => {
    executeQuery
      .mockRejectedValueOnce(new Error("SQL compilation error: invalid identifier 'ATTACHMENT'"))
      .mockResolvedValueOnce({ rows: [] }) // ALTER
      .mockResolvedValueOnce({ rows: [] }); // retry INSERT

    await submitIssue({ userId: "u1", category: "bug", description: "y".repeat(20) });

    expect(executeQuery).toHaveBeenCalledTimes(3);
    expect(executeQuery.mock.calls[1][0]).toMatch(/ALTER TABLE CL_ISSUES ADD COLUMN IF NOT EXISTS ATTACHMENT/);
    expect(executeQuery.mock.calls[2][0]).toMatch(/INSERT INTO CL_ISSUES/);
  });

  it("rethrows unrelated errors without retrying", async () => {
    executeQuery.mockRejectedValueOnce(new Error("Snowflake query timed out"));
    await expect(
      submitIssue({ userId: "u1", category: "bug", description: "z".repeat(20) })
    ).rejects.toThrow(/timed out/);
    expect(executeQuery).toHaveBeenCalledTimes(1);
  });
});
