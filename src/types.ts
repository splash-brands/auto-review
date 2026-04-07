export type AgentName = "adherence" | "problemStatement" | "testCoverage" | "correctness";

export interface Config {
  maxFiles: number;
  maxLinesChanged: number;
  skipDraftPRs: boolean;
  skipForkPRs: boolean;
  model: string;
  apiUnavailablePolicy: "skip" | "block";

  trustedTeams: string[];
  sensitivePaths: string[];
  secretPatterns: string[];
  allowlistPaths: string[];

  rulesPath: string[];
  maxTokenBudget: number;
  sections: Record<AgentName, boolean>;
}

export const DEFAULT_CONFIG: Config = {
  maxFiles: 5,
  maxLinesChanged: 200,
  skipDraftPRs: true,
  skipForkPRs: true,
  model: "openai/gpt-4o",
  apiUnavailablePolicy: "skip",

  trustedTeams: [],
  sensitivePaths: [
    "db/migrations/**",
    "**/auth/**",
    ".github/**",
    "Dockerfile*",
    "**/payment*",
    "**/payment*/**",
  ],
  secretPatterns: [
    "(?i)(api[_-]?key|secret|password|token)\\s*[:=]\\s*['\"][^'\"]{8,}",
    "(?i)BEGIN\\s+(RSA|DSA|EC|OPENSSH)\\s+PRIVATE\\s+KEY",
  ],
  allowlistPaths: [
    "docs/**",
    "**/*.md",
    "tests/**",
    "**/*_test.*",
    "**/*.test.*",
  ],

  rulesPath: [
    ".claude/skills/",
    "CLAUDE.md",
    ".cursorrules",
    ".github/copilot-instructions.md",
  ],
  maxTokenBudget: 8000,
  sections: {
    adherence: true,
    problemStatement: true,
    testCoverage: true,
    correctness: true,
  },
};

export interface FileChange {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
}

export interface PRContext {
  number: number;
  title: string;
  body: string;
  diff: string;
  filesChanged: FileChange[];
  baseBranch: string;
  baseRef: string;
  headRef: string;
  author: string;
  authorAssociation: string;
  isDraft: boolean;
  isFork: boolean;
}

export interface GateResult {
  gate: string;
  passed: boolean;
  reason?: string;
}

export type AdherenceVerdict = "PASS" | "FAIL";
export type ProblemStatementVerdict = "EXCELLENT" | "GOOD" | "BAD" | "AWFUL";
export type TestCoverageVerdict = "ADEQUATE" | "INSUFFICIENT";
export type CorrectnessVerdict = "CORRECT" | "CONCERNS";

export interface ReviewResult {
  adherence: {
    verdict: AdherenceVerdict;
    reasoning: string;
    violations?: string[];
  };
  problemStatement: {
    verdict: ProblemStatementVerdict;
    reasoning: string;
  };
  testCoverage: {
    verdict: TestCoverageVerdict;
    reasoning: string;
    gaps?: string[];
  };
  correctness: {
    verdict: CorrectnessVerdict;
    reasoning: string;
    concerns?: string[];
  };
}

export interface OrchestratorResult {
  approved: boolean;
  gates: GateResult[];
  review?: ReviewResult;
  headSha: string;
  tokenUsage?: { input: number; output: number };
  error?: string;
}
