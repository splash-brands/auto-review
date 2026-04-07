import { describe, it, expect } from "vitest";
import { parseReviewResponse } from "../../src/ai/schema.js";

const validResponse = JSON.stringify({
  adherence: { verdict: "PASS", reasoning: "Code follows conventions" },
  problemStatement: { verdict: "GOOD", reasoning: "Clear description" },
  testCoverage: { verdict: "ADEQUATE", reasoning: "Tests cover changes" },
  correctness: { verdict: "CORRECT", reasoning: "No issues found" },
});

describe("parseReviewResponse", () => {
  it("parses valid JSON response", () => {
    const result = parseReviewResponse(validResponse);
    expect(result.adherence.verdict).toBe("PASS");
    expect(result.problemStatement.verdict).toBe("GOOD");
    expect(result.testCoverage.verdict).toBe("ADEQUATE");
    expect(result.correctness.verdict).toBe("CORRECT");
  });

  it("parses JSON wrapped in markdown code fences", () => {
    const wrapped = "```json\n" + validResponse + "\n```";
    const result = parseReviewResponse(wrapped);
    expect(result.adherence.verdict).toBe("PASS");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseReviewResponse("not json")).toThrow("Failed to parse");
  });

  it("throws on missing section", () => {
    const incomplete = JSON.stringify({
      adherence: { verdict: "PASS", reasoning: "OK" },
    });
    expect(() => parseReviewResponse(incomplete)).toThrow("Missing or invalid section");
  });

  it("throws on invalid verdict", () => {
    const badVerdict = JSON.stringify({
      adherence: { verdict: "MAYBE", reasoning: "Unsure" },
      problemStatement: { verdict: "GOOD", reasoning: "OK" },
      testCoverage: { verdict: "ADEQUATE", reasoning: "OK" },
      correctness: { verdict: "CORRECT", reasoning: "OK" },
    });
    expect(() => parseReviewResponse(badVerdict)).toThrow('Invalid verdict for adherence');
  });

  it("throws on empty reasoning", () => {
    const noReasoning = JSON.stringify({
      adherence: { verdict: "PASS", reasoning: "" },
      problemStatement: { verdict: "GOOD", reasoning: "OK" },
      testCoverage: { verdict: "ADEQUATE", reasoning: "OK" },
      correctness: { verdict: "CORRECT", reasoning: "OK" },
    });
    expect(() => parseReviewResponse(noReasoning)).toThrow("Missing reasoning");
  });

  it("preserves violations and concerns arrays", () => {
    const withDetails = JSON.stringify({
      adherence: {
        verdict: "FAIL",
        reasoning: "Issues found",
        violations: ["Missing semicolons", "Wrong import order"],
      },
      problemStatement: { verdict: "BAD", reasoning: "No description" },
      testCoverage: {
        verdict: "INSUFFICIENT",
        reasoning: "No tests",
        gaps: ["Untested edge case"],
      },
      correctness: {
        verdict: "CONCERNS",
        reasoning: "Potential bug",
        concerns: ["Null check missing on line 42"],
      },
    });
    const result = parseReviewResponse(withDetails);
    expect(result.adherence.violations).toEqual(["Missing semicolons", "Wrong import order"]);
    expect(result.testCoverage.gaps).toEqual(["Untested edge case"]);
    expect(result.correctness.concerns).toEqual(["Null check missing on line 42"]);
  });
});
