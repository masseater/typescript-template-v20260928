import { createDontReviewItRule } from "../../../../create-rule.ts";

import type { ESTree } from "@oxlint/plugins";

const TEST_FILE = /\.test\.[cm]?[jt]sx?$/u;
const FILTERED_RUN_TEXT = /\brun\s+(?:\S+\s+)*?--filter(?:[\s=]|$)/u;
const GUARD = "--fail-if-no-match";

const staticElements = (node: ESTree.ArrayExpression): readonly string[] =>
  node.elements.flatMap((element) =>
    element?.type === "Literal" && typeof element.value === "string" ? [element.value] : [],
  );

const filtersRunArguments = (elements: readonly string[]): boolean =>
  elements.includes("run") &&
  elements.some((element) => element === "--filter" || element.startsWith("--filter=")) &&
  !elements.includes(GUARD);

const filtersRunText = (text: string): boolean =>
  FILTERED_RUN_TEXT.test(text) && !text.includes(GUARD);

export const noUnguardedFilteredRun = createDontReviewItRule({
  name: "no-unguarded-filtered-run--add-fail-if-no-match",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow a Vite+ filtered run spelled as an argument list or a command string without --fail-if-no-match, so a filter that matches no workspace fails instead of running nothing and exiting successfully",
      relatedGuidelines: [".claude/skills/reviews/references/failure-handling-and-fallbacks.md"],
    },
    messages: {
      unguardedFilteredRun:
        "This `vp run --filter` has no `--fail-if-no-match`, so a filter that matches no workspace prints a warning and exits with 0. Build the arguments with `filteredRunArguments` and the command line with `filteredRunCommand` from `@repo/config`, which always pass `--fail-if-no-match`.",
    },
    schema: [],
  },
  create(inspection) {
    if (TEST_FILE.test(inspection.filename)) return {};
    return {
      ArrayExpression(node: ESTree.ArrayExpression) {
        if (!filtersRunArguments(staticElements(node))) return;
        inspection.report({ node, messageId: "unguardedFilteredRun" });
      },
      Literal(node: ESTree.Literal) {
        if (typeof node.value !== "string" || !filtersRunText(node.value)) return;
        inspection.report({ node, messageId: "unguardedFilteredRun" });
      },
      TemplateLiteral(node: ESTree.TemplateLiteral) {
        const text = node.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join(" x ");
        if (!filtersRunText(text)) return;
        inspection.report({ node, messageId: "unguardedFilteredRun" });
      },
    };
  },
});
