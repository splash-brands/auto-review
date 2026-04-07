// Approximate tokens as chars / 4 (rough but sufficient for budgeting)
const CHARS_PER_TOKEN = 4;

export function truncateDiff(diff: string, maxTokenBudget: number): string {
  const maxChars = maxTokenBudget * CHARS_PER_TOKEN;

  if (diff.length <= maxChars) {
    return diff;
  }

  // Split into per-file hunks
  const hunks = splitIntoHunks(diff);

  // Prioritize: sort hunks by number of changed lines (+ and -) descending
  const scored = hunks.map((hunk) => ({
    hunk,
    changedLines: countChangedLines(hunk),
  }));
  scored.sort((a, b) => b.changedLines - a.changedLines);

  // Greedily add hunks until budget exhausted
  const selected: string[] = [];
  let usedChars = 0;
  let skippedCount = 0;

  for (const { hunk } of scored) {
    if (usedChars + hunk.length <= maxChars) {
      selected.push(hunk);
      usedChars += hunk.length;
    } else {
      skippedCount++;
    }
  }

  if (skippedCount > 0) {
    selected.push(
      `\n[... ${skippedCount} file(s) truncated to fit token budget ...]`,
    );
  }

  return selected.join("\n\n");
}

function splitIntoHunks(diff: string): string[] {
  const hunks: string[] = [];
  let current = "";

  for (const line of diff.split("\n")) {
    if (line.startsWith("--- a/") && current) {
      hunks.push(current.trim());
      current = "";
    }
    current += line + "\n";
  }

  if (current.trim()) {
    hunks.push(current.trim());
  }

  return hunks;
}

function countChangedLines(hunk: string): number {
  let count = 0;
  for (const line of hunk.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) count++;
    if (line.startsWith("-") && !line.startsWith("---")) count++;
  }
  return count;
}
