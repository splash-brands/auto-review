import { describe, it, expect } from "vitest";
import { checkSize } from "../../src/gates/size.js";
import { DEFAULT_CONFIG, FileChange } from "../../src/types.js";

const makeFile = (overrides: Partial<FileChange> = {}): FileChange => ({
  filename: "src/index.ts",
  status: "modified",
  additions: 10,
  deletions: 5,
  ...overrides,
});

describe("checkSize", () => {
  it("passes when within limits", () => {
    const files = [makeFile(), makeFile({ filename: "src/utils.ts" })];
    const result = checkSize(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(true);
    expect(result.reason).toContain("2 files");
  });

  it("fails when too many files", () => {
    const files = Array.from({ length: 6 }, (_, i) =>
      makeFile({ filename: `src/file${i}.ts`, additions: 1, deletions: 0 }),
    );
    const result = checkSize(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("6 files");
  });

  it("fails when too many lines", () => {
    const files = [makeFile({ additions: 150, deletions: 60 })];
    const result = checkSize(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("210 lines");
  });

  it("counts both additions and deletions", () => {
    const config = { ...DEFAULT_CONFIG, maxLinesChanged: 50 };
    const files = [makeFile({ additions: 30, deletions: 25 })];
    const result = checkSize(files, config);
    expect(result.passed).toBe(false);
  });

  it("passes with empty file list", () => {
    const result = checkSize([], DEFAULT_CONFIG);
    expect(result.passed).toBe(true);
  });
});
