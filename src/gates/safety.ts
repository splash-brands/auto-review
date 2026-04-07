import { Config, FileChange, GateResult } from "../types.js";

function matchGlob(pattern: string, filename: string): boolean {
  // Handle **/ at the start — matches zero or more directories
  let regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*\//g, "§GLOBSTAR_SLASH§")
    .replace(/\*\*/g, "§GLOBSTAR§")
    .replace(/\*/g, "[^/]*")
    .replace(/§GLOBSTAR_SLASH§/g, "(?:.*/)?")
    .replace(/§GLOBSTAR§/g, ".*");
  return new RegExp(`^${regexStr}$`).test(filename);
}

export function checkSafety(
  files: FileChange[],
  config: Config,
): GateResult {
  const sensitiveFiles: string[] = [];

  for (const file of files) {
    for (const pattern of config.sensitivePaths) {
      if (matchGlob(pattern, file.filename)) {
        sensitiveFiles.push(file.filename);
        break;
      }
    }
  }

  if (sensitiveFiles.length > 0) {
    return {
      gate: "safety",
      passed: false,
      reason: `Sensitive paths touched: ${sensitiveFiles.join(", ")}`,
    };
  }

  return {
    gate: "safety",
    passed: true,
    reason: "No sensitive paths touched",
  };
}
