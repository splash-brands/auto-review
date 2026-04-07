import { Config, FileChange, GateResult } from "../types.js";

function matchGlob(pattern: string, filename: string): boolean {
  let regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*\//g, "§GLOBSTAR_SLASH§")
    .replace(/\*\*/g, "§GLOBSTAR§")
    .replace(/\*/g, "[^/]*")
    .replace(/§GLOBSTAR_SLASH§/g, "(?:.*/)?")
    .replace(/§GLOBSTAR§/g, ".*");
  return new RegExp(`^${regexStr}$`).test(filename);
}

export function checkAllowlist(
  files: FileChange[],
  config: Config,
): GateResult {
  if (config.allowlistPaths.length === 0) {
    return {
      gate: "allowlist",
      passed: false,
      reason: "No allowlist configured — LLM review required",
    };
  }

  const nonAllowlisted: string[] = [];

  for (const file of files) {
    const isAllowlisted = config.allowlistPaths.some((pattern) =>
      matchGlob(pattern, file.filename),
    );
    if (!isAllowlisted) {
      nonAllowlisted.push(file.filename);
    }
  }

  if (nonAllowlisted.length === 0) {
    return {
      gate: "allowlist",
      passed: true,
      reason: "All files match allowlist — fast-path approved (no LLM needed)",
    };
  }

  return {
    gate: "allowlist",
    passed: false,
    reason: `${nonAllowlisted.length} file(s) outside allowlist — LLM review required`,
  };
}
