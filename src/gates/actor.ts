import { Config, PRContext, GateResult } from "../types.js";
import { Octokit } from "@octokit/rest";

const TRUSTED_ASSOCIATIONS = ["MEMBER", "OWNER"];

export async function checkActor(
  pr: PRContext,
  config: Config,
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<GateResult> {
  if (TRUSTED_ASSOCIATIONS.includes(pr.authorAssociation)) {
    return {
      gate: "actor",
      passed: true,
      reason: `Author ${pr.author} is org ${pr.authorAssociation.toLowerCase()}`,
    };
  }

  if (config.trustedTeams.length > 0) {
    for (const teamSlug of config.trustedTeams) {
      try {
        const { status } = await octokit.teams.getMembershipForUserInOrg({
          org: owner,
          team_slug: teamSlug,
          username: pr.author,
        });
        if (status === 200) {
          return {
            gate: "actor",
            passed: true,
            reason: `Author ${pr.author} is member of team ${teamSlug}`,
          };
        }
      } catch {
        // Not a member of this team, continue checking
      }
    }
  }

  return {
    gate: "actor",
    passed: false,
    reason: `Author ${pr.author} (${pr.authorAssociation}) is not a trusted org member or team member`,
  };
}
