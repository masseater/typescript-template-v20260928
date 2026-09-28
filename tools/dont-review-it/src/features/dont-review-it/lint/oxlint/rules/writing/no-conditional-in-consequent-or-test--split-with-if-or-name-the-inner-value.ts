import { createDontReviewItRule } from "../../../../create-rule.ts";

import type { ESTree } from "@oxlint/plugins";

export const noConditionalInConsequentOrTest = createDontReviewItRule({
  name: "no-conditional-in-consequent-or-test--split-with-if-or-name-the-inner-value",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow a conditional expression in the test or the consequent of another conditional expression, so which combination of conditions yields which value is readable from top to bottom",
      relatedGuidelines: [".claude/skills/reviews/references/remove-needless-branches-wrappers-and-work.md"],
    },
    messages: {
      nestedConditional:
        "A conditional expression must not sit in the test or the true branch of another conditional expression. Split the outer condition with if and return early, or give the inner value a name first. A chain that continues only through the false branch (a ? x : b ? y : z) is allowed.",
    },
    schema: [],
  },
  create(inspection) {
    return {
      ConditionalExpression(node: ESTree.ConditionalExpression) {
        if (
          node.test.type === "ConditionalExpression" ||
          node.consequent.type === "ConditionalExpression"
        ) {
          inspection.report({ node, messageId: "nestedConditional" });
        }
      },
    };
  },
});
