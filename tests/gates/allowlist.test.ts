import { describe, it, expect } from "vitest";
import { checkAllowlist } from "../../src/gates/allowlist.js";
import { DEFAULT_CONFIG, FileChange } from "../../src/types.js";

const makeFile = (filename: string): FileChange => ({
  filename,
  status: "modified",
  additions: 5,
  deletions: 2,
});

describe("checkAllowlist", () => {
  it("passes for docs-only changes", () => {
    const files = [makeFile("docs/guide.md"), makeFile("docs/api/reference.md")];
    const result = checkAllowlist(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(true);
    expect(result.reason).toContain("fast-path");
  });

  it("passes for markdown files", () => {
    const files = [makeFile("README.md"), makeFile("CHANGELOG.md")];
    const result = checkAllowlist(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(true);
  });

  it("passes for test files", () => {
    const files = [
      makeFile("tests/unit/auth.test.ts"),
      makeFile("tests/integration/api.test.ts"),
    ];
    const result = checkAllowlist(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(true);
  });

  it("passes for _test suffix files", () => {
    const files = [makeFile("app/models/user_test.rb")];
    const result = checkAllowlist(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(true);
  });

  it("fails for source code files", () => {
    const files = [makeFile("src/auth/login.ts")];
    const result = checkAllowlist(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("LLM review required");
  });

  it("fails if any file is outside allowlist", () => {
    const files = [
      makeFile("docs/guide.md"),
      makeFile("src/index.ts"),
    ];
    const result = checkAllowlist(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
  });

  it("fails with no allowlist configured", () => {
    const config = { ...DEFAULT_CONFIG, allowlistPaths: [] };
    const files = [makeFile("docs/guide.md")];
    const result = checkAllowlist(files, config);
    expect(result.passed).toBe(false);
  });
});
