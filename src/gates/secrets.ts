import { Config, GateResult } from "../types.js";

export function checkSecrets(
  diff: string,
  config: Config,
): GateResult {
  const findings: string[] = [];

  for (const patternStr of config.secretPatterns) {
    // Strip (?i) prefix and use JS 'i' flag instead (PCRE → JS conversion)
    const jsPattern = patternStr.replace(/^\(\?i\)/, "");
    const flags = patternStr.startsWith("(?i)") ? "gmi" : "gm";
    const regex = new RegExp(jsPattern, flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(diff)) !== null) {
      const line = diff
        .substring(Math.max(0, match.index - 40), match.index + match[0].length + 20)
        .split("\n")[0]
        .trim();
      findings.push(line.substring(0, 80));
    }
  }

  if (findings.length > 0) {
    return {
      gate: "secrets",
      passed: false,
      reason: `Potential secrets detected (${findings.length} match${findings.length > 1 ? "es" : ""}). Manual review required.`,
    };
  }

  return {
    gate: "secrets",
    passed: true,
    reason: "No secrets detected",
  };
}
