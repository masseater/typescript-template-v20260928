import { createDontReviewItRule } from "../../../../create-rule.ts";
import { passThroughExportsIn } from "../../lib/restricted-targets/pass-through-exports.ts";

import type { ESTree, Options } from "@oxlint/plugins";

const localSpecifier = /^[.#/]/u;

const relayEntryFilesFrom = (ruleOptions: Readonly<Options>): readonly string[] => {
  const [first] = ruleOptions;
  if (typeof first !== "object" || first === null || Array.isArray(first)) return [];

  const { relayEntryFiles } = first;
  if (!Array.isArray(relayEntryFiles)) return [];
  return relayEntryFiles.filter((candidate): candidate is string => typeof candidate === "string");
};

export const forbidPackageSymbolRelay = createDontReviewItRule({
  name: "forbid-package-symbol-relay--import-from-the-owner",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow a module exporting a symbol it imported from another package as is or under a new name, so each symbol keeps one import path through the package that owns it",
      relatedGuidelines: [
        ".claude/skills/reviews/references/expose-only-what-a-real-caller-uses.md",
        ".claude/skills/reviews/references/give-every-concept-one-owner.md",
      ],
    },
    messages: {
      packageSymbolRelay:
        "This module passes `{{exposed}}` from `{{specifier}}` straight to its own exports. Delete this export and import it from `{{specifier}}` where it is used. Only an entry file that a tool loads by path may forward it; list that file in the lint configuration.",
    },
    schema: [
      {
        type: "object",
        properties: {
          relayEntryFiles: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
  },
  create(inspection) {
    const normalizedFile = inspection.filename.replaceAll("\\", "/");
    const isRelayEntry = relayEntryFilesFrom(inspection.options).some(
      (entry) => normalizedFile === entry || normalizedFile.endsWith(`/${entry}`),
    );
    if (isRelayEntry) return {};

    return {
      Program(node: ESTree.Program) {
        for (const forwarded of passThroughExportsIn(node.body)) {
          if (localSpecifier.test(forwarded.specifier)) continue;
          inspection.report({
            node: forwarded.statement,
            messageId: "packageSymbolRelay",
            data: { exposed: forwarded.exposed, specifier: forwarded.specifier },
          });
        }
      },
    };
  },
});
