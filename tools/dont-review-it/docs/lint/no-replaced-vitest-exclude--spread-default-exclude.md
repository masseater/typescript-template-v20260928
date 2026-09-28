---
description: "Disallow a test config `exclude` that drops the test runner's default exclusions, so a test block that adds its own exclusions keeps the ones the runner already skips and follows them when they change"
---

# no-replaced-vitest-exclude--spread-default-exclude

<!-- BEGIN GENERATED rule-header -->

Disallow a test config `exclude` that drops the test runner's default exclusions, so a test block that adds its own exclusions keeps the ones the runner already skips and follows them when they change

- Tool: `oxlint`
- Fixable: no
- Suggestions: no
- Options: no
- Bundle: `testing`
- Source: [`no-replaced-vitest-exclude--spread-default-exclude.ts`](../../src/features/dont-review-it/lint/oxlint/rules/testing/no-replaced-vitest-exclude--spread-default-exclude.ts)

<!-- END GENERATED rule-header -->

## Violation

A test configuration block, or an inline project's test block, whose `exclude` is not an array that spreads `defaultExclude`. Writing `exclude` replaces the test runner's default exclusions, so a hand-written list drops whatever of the default it did not copy and stops following the default when it changes.

## Fix

Start the array with `...defaultExclude` from `vite-plus/test/config` and add the extra patterns after it.

<!-- BEGIN GENERATED examples -->

Code this rule rejects.

```ts
// an exclude that copies part of the default by hand is reported
// in vite.config.ts
import { defineConfig } from "vite-plus";
export default defineConfig({ test: { exclude: ["**/node_modules/**", "**/dist/**"] } });

```

Code this rule accepts.

```ts
// an exclude that starts from the default exclusions passes
// in vite.config.ts
import { defineConfig } from "vite-plus";
import { defaultExclude } from "vite-plus/test/config";
export default defineConfig({ test: { exclude: [...defaultExclude, "**/dist/**"] } });

```

```ts
// a coverage exclude is not the test exclude
// in vite.config.ts
export default { test: { coverage: { exclude: ["specs/**"] } } };

```

<!-- END GENERATED examples -->

## Messages

<!-- BEGIN GENERATED messages -->

| messageId | Text |
| --- | --- |
| `replacedExclude` | A test config \`exclude\` must not replace the test runner's default exclusions. Start the array with \`...defaultExclude\` from \`vite-plus/test/config\` and add the extra patterns after it. |

<!-- END GENERATED messages -->

## Runtime Selection

<!-- BEGIN GENERATED runtime -->

This rule runs as an oxlint JS plugin, in the same pass as every other rule the workspace ships. It reads no options. A consumer turns it on or off as a whole.

<!-- END GENERATED runtime -->
