import { Octokit } from "@octokit/rest";
import { PRContext, FileChange } from "../types.js";

export async function fetchPRContext(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PRContext> {
  const [prData, filesData] = await Promise.all([
    octokit.pulls.get({ owner, repo, pull_number: prNumber }),
    octokit.pulls.listFiles({ owner, repo, pull_number: prNumber, per_page: 100 }),
  ]);

  const pr = prData.data;
  const files = filesData.data;

  const filesChanged: FileChange[] = files.map((f) => ({
    filename: f.filename,
    status: f.status as FileChange["status"],
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,
  }));

  const diff = filesChanged
    .filter((f) => f.patch)
    .map((f) => `--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch}`)
    .join("\n\n");

  return {
    number: pr.number,
    title: pr.title,
    body: pr.body ?? "",
    diff,
    filesChanged,
    baseBranch: pr.base.ref,
    baseRef: pr.base.sha,
    headRef: pr.head.sha,
    author: pr.user?.login ?? "unknown",
    authorAssociation: pr.author_association,
    isDraft: pr.draft ?? false,
    isFork: pr.head.repo?.fork ?? false,
  };
}

export async function fetchFileFromBase(
  octokit: Octokit,
  owner: string,
  repo: string,
  baseRef: string,
  path: string,
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: baseRef,
    });

    if ("content" in data && data.content) {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }

    // Directory — list files and concatenate
    if (Array.isArray(data)) {
      const contents: string[] = [];
      for (const item of data) {
        if (item.type === "file" && item.name.endsWith(".md")) {
          const fileContent = await fetchFileFromBase(
            octokit,
            owner,
            repo,
            baseRef,
            item.path,
          );
          if (fileContent) {
            contents.push(`# ${item.name}\n\n${fileContent}`);
          }
        }
      }
      return contents.join("\n\n---\n\n") || null;
    }

    return null;
  } catch {
    return null;
  }
}

export async function fetchRepoRules(
  octokit: Octokit,
  owner: string,
  repo: string,
  baseRef: string,
  rulesPath: string[],
): Promise<string> {
  const parts: string[] = [];

  for (const path of rulesPath) {
    const content = await fetchFileFromBase(octokit, owner, repo, baseRef, path);
    if (content) {
      parts.push(`## Rules from ${path}\n\n${content}`);
    }
  }

  return parts.join("\n\n---\n\n");
}
