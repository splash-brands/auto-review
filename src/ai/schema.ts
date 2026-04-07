import { ReviewResult } from "../types.js";

const VALID_ADHERENCE = ["PASS", "FAIL"];
const VALID_PROBLEM_STATEMENT = ["EXCELLENT", "GOOD", "BAD", "AWFUL"];
const VALID_TEST_COVERAGE = ["ADEQUATE", "INSUFFICIENT"];
const VALID_CORRECTNESS = ["CORRECT", "CONCERNS"];

export function parseReviewResponse(raw: string): ReviewResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Try extracting JSON from markdown code fences
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      parsed = JSON.parse(match[1]);
    } else {
      throw new Error(`Failed to parse LLM response as JSON: ${raw.substring(0, 200)}`);
    }
  }

  const obj = parsed as Record<string, unknown>;

  return {
    adherence: validateSection(
      obj.adherence,
      "adherence",
      VALID_ADHERENCE,
    ) as ReviewResult["adherence"],
    problemStatement: validateSection(
      obj.problemStatement,
      "problemStatement",
      VALID_PROBLEM_STATEMENT,
    ) as ReviewResult["problemStatement"],
    testCoverage: validateSection(
      obj.testCoverage,
      "testCoverage",
      VALID_TEST_COVERAGE,
    ) as ReviewResult["testCoverage"],
    correctness: validateSection(
      obj.correctness,
      "correctness",
      VALID_CORRECTNESS,
    ) as ReviewResult["correctness"],
  };
}

function validateSection(
  section: unknown,
  name: string,
  validVerdicts: string[],
): Record<string, unknown> {
  if (!section || typeof section !== "object") {
    throw new Error(`Missing or invalid section: ${name}`);
  }

  const s = section as Record<string, unknown>;

  if (typeof s.verdict !== "string" || !validVerdicts.includes(s.verdict)) {
    throw new Error(
      `Invalid verdict for ${name}: "${s.verdict}" (expected: ${validVerdicts.join(", ")})`,
    );
  }

  if (typeof s.reasoning !== "string" || s.reasoning.length === 0) {
    throw new Error(`Missing reasoning for ${name}`);
  }

  return s;
}
