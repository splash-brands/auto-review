import { describe, it, expect } from "vitest";
import { checkSecrets } from "../../src/gates/secrets.js";
import { DEFAULT_CONFIG } from "../../src/types.js";

describe("checkSecrets", () => {
  it("passes for clean diff", () => {
    const diff = `
+function greet(name: string) {
+  return "Hello " + name;
+}`;
    const result = checkSecrets(diff, DEFAULT_CONFIG);
    expect(result.passed).toBe(true);
  });

  it("detects API key assignments", () => {
    const diff = `+const API_KEY = "sk-1234567890abcdef"`;
    const result = checkSecrets(diff, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("secrets detected");
  });

  it("detects password assignments", () => {
    const diff = `+password = "supersecretpass123"`;
    const result = checkSecrets(diff, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
  });

  it("detects private keys", () => {
    const diff = `+-----BEGIN RSA PRIVATE KEY-----`;
    const result = checkSecrets(diff, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
  });

  it("ignores short values (likely not secrets)", () => {
    const diff = `+token = "abc"`;
    const result = checkSecrets(diff, DEFAULT_CONFIG);
    expect(result.passed).toBe(true);
  });

  it("detects multiple secrets", () => {
    const diff = `
+api_key = "sk-1234567890abcdef"
+secret = "another_secret_value_here"`;
    const result = checkSecrets(diff, DEFAULT_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("2 match");
  });
});
