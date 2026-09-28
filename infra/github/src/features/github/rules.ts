import type { RulesetProps } from "alchemy/GitHub";
import type { RepositoryAddress } from "./repository.ts";

const MAIN_BRANCH_REF = "refs/heads/main";
const MAIN_RULESET_NAME = "main";
const MERGE_QUEUE_APP_ID = 10_562;
const requiredPullRequestChecks = ["check"] as const;

const mainBranchRuleset = (address: RepositoryAddress): RulesetProps => ({
  bypassActors: [{ actorType: "Integration", actorId: MERGE_QUEUE_APP_ID, bypassMode: "always" }],
  conditions: { include: [MAIN_BRANCH_REF] },
  enforcement: "active",
  name: MAIN_RULESET_NAME,
  owner: address.owner,
  repository: address.repository,
  rules: {
    deletion: true,
    nonFastForward: true,
    pullRequest: { requiredApprovingReviewCount: 0 },
    requiredStatusChecks: {
      checks: requiredPullRequestChecks.map((checkName) => ({ context: checkName })),
    },
    update: true,
  },
  target: "branch",
});

export { mainBranchRuleset, requiredPullRequestChecks };
