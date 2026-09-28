import { createDontReviewItRule } from "../../../../create-rule.ts";
import { objectPropertyOf } from "../../lib/object-literal.ts";
import { testRunnerBlocks } from "../../lib/test-runner-blocks.ts";
import { isTestRunnerConfig } from "../../lib/test-runner-config.ts";

import type { ESTree } from "@oxlint/plugins";

const DEFAULT_EXCLUDE = "defaultExclude";

const spreadsDefaultExclude = (element: ESTree.ArrayExpression["elements"][number]): boolean =>
  element?.type === "SpreadElement" &&
  element.argument.type === "Identifier" &&
  element.argument.name === DEFAULT_EXCLUDE;

const replacedExclude = (block: ESTree.ObjectExpression): ESTree.ObjectProperty | null => {
  const exclude = objectPropertyOf({ object: block, key: "exclude" });
  if (exclude === null) return null;
  return exclude.value.type === "ArrayExpression" &&
    exclude.value.elements.some(spreadsDefaultExclude)
    ? null
    : exclude;
};

export const noReplacedVitestExclude = createDontReviewItRule({
  name: "no-replaced-vitest-exclude--spread-default-exclude",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow a test config `exclude` that drops the test runner's default exclusions, so a test block that adds its own exclusions keeps the ones the runner already skips and follows them when they change",
      relatedGuidelines: [".claude/skills/reviews/references/ownership-and-duplication.md"],
    },
    messages: {
      replacedExclude:
        "A test config `exclude` must not replace the test runner's default exclusions. Start the array with `...defaultExclude` from `vite-plus/test/config` and add the extra patterns after it.",
    },
    schema: [],
  },
  create(inspection) {
    if (!isTestRunnerConfig(inspection.filename)) return {};

    return {
      Program(node: ESTree.Program) {
        for (const block of testRunnerBlocks(node)) {
          const exclude = replacedExclude(block);
          if (exclude !== null) inspection.report({ node: exclude, messageId: "replacedExclude" });
        }
      },
    };
  },
});
