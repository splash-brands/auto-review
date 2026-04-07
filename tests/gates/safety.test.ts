import { describe, it, expect } from "vitest";
import { checkSafety } from "../../src/gates/safety.js";
import { DEFAULT_CONFIG, FileChange } from "../../src/types.js";

const makeFile = (filename: string): FileChange => ({
  filename,
  status: "modified",
  additions: 5,
  deletions: 2,
});

describe("checkSafety", () => {
  it("passes for non-sensitive files", () => {
    const files = [makeFile("src/components/Button.tsx")];
    const result = checkSafety(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(true);
  });

  it("fails for db migrations", () => {
    const files = [makeFile("db/migrations/20260101_add_users.rb")];
    const result = checkSafety(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("db/migrations");
  });

  it("fails for auth files", () => {
    const files = [makeFile("app/services/auth/session.ts")];
    const result = checkSafety(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("auth");
  });

  it("fails for GitHub workflows", () => {
    const files = [makeFile(".github/workflows/ci.yml")];
    const result = checkSafety(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
  });

  it("fails for Dockerfile", () => {
    const files = [makeFile("Dockerfile")];
    const result = checkSafety(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
  });

  it("fails for payment-related files", () => {
    const files = [makeFile("app/models/payment_processor.rb")];
    const result = checkSafety(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
  });

  it("passes with empty file list", () => {
    const result = checkSafety([], DEFAULT_CONFIG);
    expect(result.passed).toBe(true);
  });

  it("reports all sensitive files in reason", () => {
    const files = [
      makeFile("db/migrations/001.sql"),
      makeFile(".github/workflows/deploy.yml"),
    ];
    const result = checkSafety(files, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("db/migrations");
    expect(result.reason).toContain(".github/workflows");
  });
});
