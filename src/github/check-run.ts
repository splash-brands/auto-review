import { Octokit } from "@octokit/rest";
import { OrchestratorResult } from "../types.js";
import { formatCheckRunSummary } from "../utils/markdown.js";

export async function createCheckRun(
  octokit: Octokit,
  owner: string,
  repo: string,
  headSha: string,
  result: OrchestratorResult,
): Promise<void> {
  const summary = formatCheckRunSummary(result);

  // GitHub Check Run output text has a 65535 char limit
  const truncatedSummary =
    summary.length > 65000
      ? summary.substring(0, 65000) + "\n\n[... truncated ...]"
      : summary;

  await octokit.checks.create({
    owner,
    repo,
    name: "PR Auto-Approve",
    head_sha: headSha,
    status: "completed",
    conclusion: result.approved ? "success" : "failure",
    output: {
      title: result.approved
        ? "Auto-approved"
        : "Review required",
      summary: truncatedSummary,
      text: JSON.stringify(
        {
          approved: result.approved,
          gates: result.gates,
          review: result.review ?? null,
          headSha: result.headSha,
          tokenUsage: result.tokenUsage ?? null,
        },
        null,
        2,
      ),
    },
  });
}
