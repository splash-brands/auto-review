import { Config, FileChange, GateResult } from "../types.js";

export function checkSize(
  files: FileChange[],
  config: Config,
): GateResult {
  const totalLines = files.reduce(
    (sum, f) => sum + f.additions + f.deletions,
    0,
  );
  const fileCount = files.length;

  if (fileCount > config.maxFiles) {
    return {
      gate: "size",
      passed: false,
      reason: `${fileCount} files changed (limit: ${config.maxFiles})`,
    };
  }

  if (totalLines > config.maxLinesChanged) {
    return {
      gate: "size",
      passed: false,
      reason: `${totalLines} lines changed (limit: ${config.maxLinesChanged})`,
    };
  }

  return {
    gate: "size",
    passed: true,
    reason: `${fileCount} files, ${totalLines} lines (limit: ${config.maxFiles}/${config.maxLinesChanged})`,
  };
}
