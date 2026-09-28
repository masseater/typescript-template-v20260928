import { createDontReviewItRule } from "../../../../create-rule.ts";
import { objectPropertyOf, objectValueOf } from "../../lib/object-literal.ts";
import { testRunnerBlocks } from "../../lib/test-runner-blocks.ts";
import { isTestRunnerConfig } from "../../lib/test-runner-config.ts";

import type { ESTree } from "@oxlint/plugins";

const DEFAULT_POOL = "forks";

const restatedPool = (block: ESTree.ObjectExpression): ESTree.ObjectProperty | null => {
  const pool = objectPropertyOf({ object: block, key: "pool" });
  return pool?.value.type === "Literal" && pool.value.value === DEFAULT_POOL ? pool : null;
};

const pinnedWorkersUnderSerialFiles = (
  block: ESTree.ObjectExpression,
): ESTree.ObjectProperty | null => {
  const fileParallelism = objectValueOf({ object: block, key: "fileParallelism" });
  if (fileParallelism?.type !== "Literal" || fileParallelism.value !== false) return null;
  return objectPropertyOf({ object: block, key: "maxWorkers" });
};

export const noRestatedVitestDefault = createDontReviewItRule({
  name: "no-restated-vitest-default--delete-the-restated-option",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow a test config option that only restates what the test runner already does, so every option left in the config is one that changes the run",
      relatedGuidelines: [".claude/skills/reviews/references/ownership-and-duplication.md"],
    },
    messages: {
      restatedPool:
        'A test config must not set `pool: "forks"`, the default pool of the test runner. Delete `pool`.',
      pinnedWorkersUnderSerialFiles:
        "A test config must not set `maxWorkers` next to `fileParallelism: false`, which already runs a single worker. Delete `maxWorkers`.",
    },
    schema: [],
  },
  create(inspection) {
    if (!isTestRunnerConfig(inspection.filename)) return {};

    return {
      Program(node: ESTree.Program) {
        for (const block of testRunnerBlocks(node)) {
          const pool = restatedPool(block);
          if (pool !== null) inspection.report({ node: pool, messageId: "restatedPool" });
          const maxWorkers = pinnedWorkersUnderSerialFiles(block);
          if (maxWorkers !== null) {
            inspection.report({ node: maxWorkers, messageId: "pinnedWorkersUnderSerialFiles" });
          }
        }
      },
    };
  },
});
