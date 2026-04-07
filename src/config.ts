import { Octokit } from "@octokit/rest";
import { Config, DEFAULT_CONFIG } from "./types.js";

export async function loadConfig(
  octokit: Octokit,
  owner: string,
  repo: string,
  baseRef: string,
  configPath: string,
): Promise<Config> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: configPath,
      ref: baseRef,
    });

    if ("content" in data && data.content) {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      const parsed = parseYaml(content);
      return mergeConfig(parsed);
    }
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      // Config file not found in base branch — use defaults
      return { ...DEFAULT_CONFIG };
    }
    throw err;
  }

  return { ...DEFAULT_CONFIG };
}

function mergeConfig(parsed: Record<string, unknown>): Config {
  return {
    maxFiles: asNumber(parsed.maxFiles, DEFAULT_CONFIG.maxFiles),
    maxLinesChanged: asNumber(parsed.maxLinesChanged, DEFAULT_CONFIG.maxLinesChanged),
    skipDraftPRs: asBoolean(parsed.skipDraftPRs, DEFAULT_CONFIG.skipDraftPRs),
    skipForkPRs: asBoolean(parsed.skipForkPRs, DEFAULT_CONFIG.skipForkPRs),
    model: asString(parsed.model, DEFAULT_CONFIG.model),
    apiUnavailablePolicy: parsed.apiUnavailablePolicy === "block" ? "block" : "skip",

    trustedTeams: asStringArray(parsed.trustedTeams, DEFAULT_CONFIG.trustedTeams),
    sensitivePaths: asStringArray(parsed.sensitivePaths, DEFAULT_CONFIG.sensitivePaths),
    secretPatterns: asStringArray(parsed.secretPatterns, DEFAULT_CONFIG.secretPatterns),
    allowlistPaths: asStringArray(parsed.allowlistPaths, DEFAULT_CONFIG.allowlistPaths),

    rulesPath: asStringArray(parsed.rulesPath, DEFAULT_CONFIG.rulesPath),
    maxTokenBudget: asNumber(parsed.maxTokenBudget, DEFAULT_CONFIG.maxTokenBudget),
    sections: {
      adherence: asBoolean((parsed.sections as Record<string, unknown>)?.adherence, true),
      problemStatement: asBoolean((parsed.sections as Record<string, unknown>)?.problemStatement, true),
      testCoverage: asBoolean((parsed.sections as Record<string, unknown>)?.testCoverage, true),
      correctness: asBoolean((parsed.sections as Record<string, unknown>)?.correctness, true),
    },
  };
}

// Minimal YAML parser — handles flat keys, arrays, and nested objects
// Enough for our simple config format; avoids adding a yaml dependency
export function parseYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");
  let currentKey = "";
  let currentArray: string[] | null = null;
  let currentObject: Record<string, unknown> | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");

    // Skip comments and empty lines
    if (line.trim() === "" || line.trim().startsWith("#")) {
      continue;
    }

    // Array item (starts with "  - ")
    if (/^\s+-\s+/.test(line) && currentArray !== null) {
      const value = line.replace(/^\s+-\s+/, "").replace(/^["']|["']$/g, "").trim();
      currentArray.push(value);
      continue;
    }

    // Nested object value (starts with "  key: value")
    if (/^\s+\w+:/.test(line) && currentObject !== null) {
      const match = line.match(/^\s+(\w+):\s*(.+)$/);
      if (match) {
        currentObject[match[1]] = parseValue(match[2]);
      }
      continue;
    }

    // Save previous collection
    if (currentArray !== null) {
      result[currentKey] = currentArray;
      currentArray = null;
    }
    if (currentObject !== null) {
      result[currentKey] = currentObject;
      currentObject = null;
    }

    // Top-level key: value
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();

      if (value === "" || value === "|") {
        // Could be array or object — check next line
        currentArray = [];
        currentObject = {};
        continue;
      }

      result[currentKey] = parseValue(value);
    }
  }

  // Save last collection
  if (currentArray !== null && currentArray.length > 0) {
    result[currentKey] = currentArray;
  } else if (currentObject !== null && Object.keys(currentObject).length > 0) {
    result[currentKey] = currentObject;
  }

  return result;
}

function parseValue(value: string): unknown {
  const trimmed = value.replace(/^["']|["']$/g, "").trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  return trimmed;
}

function asNumber(val: unknown, def: number): number {
  return typeof val === "number" ? val : def;
}

function asBoolean(val: unknown, def: boolean): boolean {
  return typeof val === "boolean" ? val : def;
}

function asString(val: unknown, def: string): string {
  return typeof val === "string" ? val : def;
}

function asStringArray(val: unknown, def: string[]): string[] {
  return Array.isArray(val) ? val.filter((v): v is string => typeof v === "string") : def;
}
