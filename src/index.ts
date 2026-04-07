import * as core from "@actions/core";
import * as github from "@actions/github";
import { Octokit } from "@octokit/rest";
import { loadConfig } from "./config.js";
import { fetchPRContext } from "./github/pr.js";
import { createCheckRun } from "./github/check-run.js";
import { postAdvisoryComment } from "./github/comment.js";
import { orchestrate } from "./orchestrator.js";

async function run(): Promise<void> {
  const token = core.getInput("github-token", { required: true });
  const configPath = core.getInput("config-path") || ".pr-auto-approve.yml";

  const octokit = new Octokit({ auth: token });
  const ctx = github.context;

  const prNumber = ctx.payload.pull_request?.number;
  if (!prNumber) {
    core.info("Not a pull_request event — skipping");
    return;
  }

  const owner = ctx.repo.owner;
  const repo = ctx.repo.repo;

  core.info(`Reviewing PR #${prNumber} in ${owner}/${repo}`);

  // Fetch PR context
  const pr = await fetchPRContext(octokit, owner, repo, prNumber);

  // Load config from BASE branch (security: never from PR head)
  const config = await loadConfig(octokit, owner, repo, pr.baseRef, configPath);

  core.info(`Config loaded: maxFiles=${config.maxFiles}, maxLines=${config.maxLinesChanged}, model=${config.model}`);

  // Run orchestrator
  const result = await orchestrate(pr, config, octokit, owner, repo, token);

  // Create Check Run
  await createCheckRun(octokit, owner, repo, pr.headRef, result);

  // Post advisory comment if there are correctness concerns
  if (result.review?.correctness.verdict === "CONCERNS") {
    await postAdvisoryComment(octokit, owner, repo, prNumber, result);
  }

  // Set outputs
  core.setOutput("approved", result.approved.toString());
  core.setOutput("results", JSON.stringify(result));

  if (result.approved) {
    core.info(`PR #${prNumber} auto-approved (HEAD: ${pr.headRef.substring(0, 7)})`);
  } else {
    const failedGates = result.gates.filter((g) => !g.passed);
    const reasons = failedGates.map((g) => `${g.gate}: ${g.reason}`);
    if (result.error) reasons.push(result.error);
    if (result.review) {
      if (result.review.adherence.verdict === "FAIL")
        reasons.push("adherence: " + result.review.adherence.reasoning);
      if (!["EXCELLENT", "GOOD"].includes(result.review.problemStatement.verdict))
        reasons.push("problemStatement: " + result.review.problemStatement.reasoning);
      if (result.review.testCoverage.verdict === "INSUFFICIENT")
        reasons.push("testCoverage: " + result.review.testCoverage.reasoning);
    }
    core.info(`PR #${prNumber} not approved: ${reasons.join("; ")}`);
  }
}

run().catch((err) => {
  core.setFailed(err instanceof Error ? err.message : String(err));
});
