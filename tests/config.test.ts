import { describe, it, expect } from "vitest";
import { parseYaml } from "../src/config.js";

describe("parseYaml", () => {
  it("parses simple key-value pairs", () => {
    const yaml = `
maxFiles: 10
skipDraftPRs: true
model: "openai/gpt-4o"
`;
    const result = parseYaml(yaml);
    expect(result.maxFiles).toBe(10);
    expect(result.skipDraftPRs).toBe(true);
    expect(result.model).toBe("openai/gpt-4o");
  });

  it("parses arrays", () => {
    const yaml = `
sensitivePaths:
  - "db/migrations/**"
  - "**/auth/**"
  - ".github/**"
`;
    const result = parseYaml(yaml);
    expect(result.sensitivePaths).toEqual([
      "db/migrations/**",
      "**/auth/**",
      ".github/**",
    ]);
  });

  it("parses nested objects", () => {
    const yaml = `
sections:
  adherence: true
  correctness: false
`;
    const result = parseYaml(yaml);
    expect(result.sections).toEqual({
      adherence: true,
      correctness: false,
    });
  });

  it("handles comments and empty lines", () => {
    const yaml = `
# This is a comment
maxFiles: 5

# Another comment
maxLinesChanged: 200
`;
    const result = parseYaml(yaml);
    expect(result.maxFiles).toBe(5);
    expect(result.maxLinesChanged).toBe(200);
  });

  it("handles quoted and unquoted strings", () => {
    const yaml = `
model: openai/gpt-4o
apiUnavailablePolicy: "skip"
`;
    const result = parseYaml(yaml);
    expect(result.model).toBe("openai/gpt-4o");
    expect(result.apiUnavailablePolicy).toBe("skip");
  });

  it("returns empty object for empty input", () => {
    expect(parseYaml("")).toEqual({});
    expect(parseYaml("# only comments")).toEqual({});
  });
});
