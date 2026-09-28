import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem } from "effect";
import { RuleTester } from "oxlint/plugins-dev";
import { describe, it, test } from "vite-plus/test";

import type { WorkspaceLintRule } from "./create-workspace-lint-rule.ts";

type TesterCases = Parameters<RuleTester["run"]>[2];

type Documented = { readonly documented?: boolean };

type LintRuleWorkspace = {
  readonly root: string;
  readonly test: RuleTester.ItFn;
};

/** @public */
export const lintRuleWorkspace = (prefix: string): Promise<LintRuleWorkspace> =>
  Effect.gen(function* madeLintRuleWorkspace() {
    const filesystem = yield* FileSystem.FileSystem;
    const root = yield* filesystem.realPath(yield* filesystem.makeTempDirectory({ prefix }));
    const removed = filesystem.remove(root, { force: true, recursive: true });
    const removingTest = test.extend(
      "lintRuleWorkspaceRemoval",
      { auto: true, scope: "file" },
      ({}, { onCleanup }) => {
        onCleanup(() => Effect.runPromise(removed));
      },
    );
    return { root, test: removingTest };
  }).pipe(Effect.provide(NodeServices.layer), Effect.runPromise);

/** @public */
export const testLintRule = (
  rule: WorkspaceLintRule,
  cases: {
    readonly valid: readonly (Extract<TesterCases["valid"][number], object> & Documented)[];
    readonly invalid: readonly (TesterCases["invalid"][number] & Documented)[];
  },
  ruleTest: RuleTester.ItFn = it,
): void => {
  RuleTester.describe = describe;
  RuleTester.it = ruleTest;
  RuleTester.itOnly = ruleTest.only ?? it.only;
  new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(rule.name, rule, {
    valid: [...cases.valid],
    invalid: [...cases.invalid],
  });
};
export type { Documented, LintRuleWorkspace, TesterCases };
