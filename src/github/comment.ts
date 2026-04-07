import { Octokit } from "@octokit/rest";
import { OrchestratorResult } from "../types.js";
import { formatAdvisoryComment } from "../utils/markdown.js";

export async function postAdvisoryComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  result: OrchestratorResult,
): Promise<void> {
  const body = formatAdvisoryComment(result);
  if (!body) return;

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
}
