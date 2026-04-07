import { Octokit } from "@octokit/rest";
import { Config, PRContext, GateResult, OrchestratorResult } from "./types.js";
import { checkSize } from "./gates/size.js";
import { checkSafety } from "./gates/safety.js";
import { checkActor } from "./gates/actor.js";
import { checkSecrets } from "./gates/secrets.js";
import { checkAllowlist } from "./gates/allowlist.js";
import { runReview } from "./review/reviewer.js";
import { fetchRepoRules } from "./github/pr.js";

export async function orchestrate(
  pr: PRContext,
  config: Config,
  octokit: Octokit,
  owner: string,
  repo: string,
  token: string,
): Promise<OrchestratorResult> {
  const gates: GateResult[] = [];

  // Gate 1: Draft PR
  if (config.skipDraftPRs && pr.isDraft) {
    gates.push({ gate: "draft", passed: false, reason: "PR is draft — skipping" });
    return { approved: false, gates, headSha: pr.headRef };
  }
  gates.push({ gate: "draft", passed: true, reason: "Not a draft" });

  // Gate 2: Fork PR
  if (config.skipForkPRs && pr.isFork) {
    gates.push({ gate: "fork", passed: false, reason: "PR is from fork — skipping" });
    return { approved: false, gates, headSha: pr.headRef };
  }
  gates.push({ gate: "fork", passed: true, reason: "Not a fork" });

  // Gate 3: Actor trust
  const actorResult = await checkActor(pr, config, octokit, owner, repo);
  gates.push(actorResult);
  if (!actorResult.passed) {
    return { approved: false, gates, headSha: pr.headRef };
  }

  // Gate 4: Size
  const sizeResult = checkSize(pr.filesChanged, config);
  gates.push(sizeResult);
  if (!sizeResult.passed) {
    return { approved: false, gates, headSha: pr.headRef };
  }

  // Gate 5: Safety (sensitive paths)
  const safetyResult = checkSafety(pr.filesChanged, config);
  gates.push(safetyResult);
  if (!safetyResult.passed) {
    return { approved: false, gates, headSha: pr.headRef };
  }

  // Gate 6: Secret scanning
  const secretsResult = checkSecrets(pr.diff, config);
  gates.push(secretsResult);
  if (!secretsResult.passed) {
    return { approved: false, gates, headSha: pr.headRef };
  }

  // Gate 7: Allowlist fast-path
  const allowlistResult = checkAllowlist(pr.filesChanged, config);
  gates.push(allowlistResult);
  if (allowlistResult.passed) {
    // All files match allowlist — approve without LLM
    return { approved: true, gates, headSha: pr.headRef };
  }

  // LLM Review
  try {
    const repoRules = await fetchRepoRules(
      octokit,
      owner,
      repo,
      pr.baseRef,
      config.rulesPath,
    );

    const { result: review, tokenUsage } = await runReview(
      pr,
      config,
      repoRules,
      token,
    );

    const gatingPassed =
      review.adherence.verdict === "PASS" &&
      (review.problemStatement.verdict === "EXCELLENT" ||
        review.problemStatement.verdict === "GOOD") &&
      review.testCoverage.verdict === "ADEQUATE";

    return {
      approved: gatingPassed,
      gates,
      review,
      headSha: pr.headRef,
      tokenUsage,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    if (config.apiUnavailablePolicy === "skip") {
      return {
        approved: false,
        gates,
        headSha: pr.headRef,
        error: `AI review skipped: ${errorMsg}`,
      };
    }

    throw err;
  }
}
