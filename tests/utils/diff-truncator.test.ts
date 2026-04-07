import { describe, it, expect } from "vitest";
import { truncateDiff } from "../../src/utils/diff-truncator.js";

describe("truncateDiff", () => {
  it("returns diff as-is when within budget", () => {
    const diff = "+hello world";
    const result = truncateDiff(diff, 1000);
    expect(result).toBe(diff);
  });

  it("truncates large diffs", () => {
    const largeDiff = Array.from({ length: 100 }, (_, i) =>
      `--- a/file${i}.ts\n+++ b/file${i}.ts\n+${"x".repeat(200)}`,
    ).join("\n\n");

    const result = truncateDiff(largeDiff, 500);
    expect(result.length).toBeLessThan(500 * 4 + 200); // budget + truncation message
    expect(result).toContain("truncated");
  });

  it("prioritizes hunks with more changes", () => {
    const smallHunk =
      "--- a/small.ts\n+++ b/small.ts\n+one line";
    const largeHunk =
      "--- a/large.ts\n+++ b/large.ts\n" +
      Array.from({ length: 20 }, () => "+changed line").join("\n");

    const diff = `${smallHunk}\n\n${largeHunk}`;
    // Budget fits the large hunk but not both
    const result = truncateDiff(diff, 150);
    expect(result).toContain("large.ts");
  });

  it("handles empty diff", () => {
    expect(truncateDiff("", 1000)).toBe("");
  });
});
