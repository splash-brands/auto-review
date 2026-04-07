import { GateResult, ReviewResult, OrchestratorResult } from "../types.js";

export function formatCheckRunSummary(result: OrchestratorResult): string {
  const lines: string[] = [];

  lines.push("## PR Auto-Review\n");

  // Deterministic Gates table
  lines.push("### Deterministic Gates");
  lines.push("| Gate | Status |");
  lines.push("|------|--------|");
  for (const gate of result.gates) {
    const icon = gate.passed ? "PASS" : "FAIL";
    const reason = gate.reason ?? "";
    lines.push(`| ${gate.gate} | ${icon} ${reason} |`);
  }

  // LLM Review table
  if (result.review) {
    lines.push("\n### AI Review");
    lines.push("| Section | Verdict | Gating |");
    lines.push("|---------|---------|--------|");

    const r = result.review;
    lines.push(
      `| Adherence | ${r.adherence.verdict} | Yes |`,
    );
    lines.push(
      `| Problem Statement | ${r.problemStatement.verdict} | Yes |`,
    );
    lines.push(
      `| Test Coverage | ${r.testCoverage.verdict} | Yes |`,
    );
    lines.push(
      `| Correctness | ${r.correctness.verdict} (advisory) | No |`,
    );

    // Details for failures and advisories
    if (r.adherence.verdict === "FAIL" && r.adherence.violations?.length) {
      lines.push(`\n#### Adherence Violations`);
      for (const v of r.adherence.violations) {
        lines.push(`- ${v}`);
      }
    }

    if (r.testCoverage.verdict === "INSUFFICIENT" && r.testCoverage.gaps?.length) {
      lines.push(`\n#### Test Coverage Gaps`);
      for (const g of r.testCoverage.gaps) {
        lines.push(`- ${g}`);
      }
    }

    if (r.correctness.verdict === "CONCERNS" && r.correctness.concerns?.length) {
      lines.push(`\n#### Correctness Advisory`);
      for (const c of r.correctness.concerns) {
        lines.push(`> ${c}`);
      }
    }
  }

  if (result.error) {
    lines.push(`\n### Error\n${result.error}`);
  }

  // Final result
  const status = result.approved ? "CHECK PASSED" : "CHECK FAILED";
  lines.push(`\n**Result: ${status}** (HEAD: ${result.headSha.substring(0, 7)})`);

  // Token usage
  if (result.tokenUsage) {
    lines.push(
      `\n<details><summary>Token usage</summary>\n${result.tokenUsage.input} in / ${result.tokenUsage.output} out\n</details>`,
    );
  }

  return lines.join("\n");
}

export function formatAdvisoryComment(result: OrchestratorResult): string | null {
  if (!result.review) return null;

  const r = result.review;
  const hasAdvisory =
    r.correctness.verdict === "CONCERNS" && r.correctness.concerns?.length;

  if (!hasAdvisory) return null;

  const lines: string[] = [];
  lines.push("### Correctness Advisory (non-blocking)\n");
  lines.push(r.correctness.reasoning);
  if (r.correctness.concerns?.length) {
    lines.push("");
    for (const c of r.correctness.concerns) {
      lines.push(`- ${c}`);
    }
  }
  lines.push(
    `\n*This is advisory only and does not block auto-approval.*`,
  );

  return lines.join("\n");
}
