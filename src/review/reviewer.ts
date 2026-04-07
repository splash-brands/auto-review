import * as fs from "fs";
import * as path from "path";
import { Config, PRContext, ReviewResult } from "../types.js";
import { callModel, AIResponse } from "../ai/client.js";
import { parseReviewResponse } from "../ai/schema.js";
import { truncateDiff } from "../utils/diff-truncator.js";

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, "../prompts/review.md"),
  "utf-8",
);

export interface ReviewOutput {
  result: ReviewResult;
  tokenUsage: { input: number; output: number };
}

export async function runReview(
  pr: PRContext,
  config: Config,
  repoRules: string,
  token: string,
): Promise<ReviewOutput> {
  const truncatedDiff = truncateDiff(pr.diff, config.maxTokenBudget);

  const userMessage = buildUserMessage(pr, truncatedDiff, repoRules, config);

  const response: AIResponse = await callModel(
    token,
    config.model,
    SYSTEM_PROMPT,
    userMessage,
  );

  const result = parseReviewResponse(response.content);

  return {
    result,
    tokenUsage: response.usage,
  };
}

function buildUserMessage(
  pr: PRContext,
  diff: string,
  repoRules: string,
  config: Config,
): string {
  const parts: string[] = [];

  parts.push("## PR Information");
  parts.push(`Title: ${pr.title}`);
  parts.push(`Author: ${pr.author}`);
  parts.push(`Base: ${pr.baseBranch}`);
  if (pr.body) {
    parts.push(`\n### Description\n${pr.body}`);
  }

  parts.push("\n## Files Changed");
  for (const f of pr.filesChanged) {
    parts.push(`- ${f.status}: ${f.filename} (+${f.additions}/-${f.deletions})`);
  }

  parts.push("\n## Diff");
  parts.push("```diff");
  parts.push(diff);
  parts.push("```");

  if (repoRules) {
    parts.push("\n## Project Rules (from base branch)");
    parts.push(repoRules);
  } else {
    parts.push("\n## Project Rules");
    parts.push("No project-specific rules found. Assess against general best practices.");
  }

  const disabledSections: string[] = [];
  if (!config.sections.adherence) disabledSections.push("adherence");
  if (!config.sections.problemStatement) disabledSections.push("problemStatement");
  if (!config.sections.testCoverage) disabledSections.push("testCoverage");
  if (!config.sections.correctness) disabledSections.push("correctness");

  if (disabledSections.length > 0) {
    parts.push(
      `\nNote: The following sections are disabled — return PASS/CORRECT for them: ${disabledSections.join(", ")}`,
    );
  }

  return parts.join("\n");
}
