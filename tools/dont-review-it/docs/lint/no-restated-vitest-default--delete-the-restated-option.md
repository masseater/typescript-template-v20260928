---
description: "Disallow a test config option that only restates what the test runner already does, so every option left in the config is one that changes the run"
---

# no-restated-vitest-default--delete-the-restated-option

<!-- BEGIN GENERATED rule-header -->

Disallow a test config option that only restates what the test runner already does, so every option left in the config is one that changes the run

- Tool: `oxlint`
- Fixable: no
- Suggestions: no
- Options: no
- Bundle: `testing`
- Source: [`no-restated-vitest-default--delete-the-restated-option.ts`](../../src/features/dont-review-it/lint/oxlint/rules/testing/no-restated-vitest-default--delete-the-restated-option.ts)

<!-- END GENERATED rule-header -->

## Violation

A test configuration block, or an inline project's test block, that sets `pool: "forks"`, which is what the test runner already uses, or sets `maxWorkers` next to `fileParallelism: false`, where the test runner already runs a single worker.

## Fix

Delete the restated option, so the options left in the config are the ones that change the run and follow the runner when its defaults move.

<!-- BEGIN GENERATED examples -->

Code this rule rejects.

```ts
// the default pool spelled out is reported
// in vite.config.ts
import { defineConfig } from "vite-plus";
export default defineConfig({ test: { pool: "forks" } });

```

```ts
// a worker count next to files running one at a time is reported
// in vite.config.ts
export default { test: { fileParallelism: false, maxWorkers: 1 } };

```

Code this rule accepts.

```ts
// a pool other than the default passes
// in vite.config.ts
import { defineConfig } from "vite-plus";
export default defineConfig({ test: { pool: "threads" } });

```

```ts
// files run one at a time without a worker count passes
// in vite.config.ts
export default { test: { fileParallelism: false } };

```

<!-- END GENERATED examples -->

## Messages

<!-- BEGIN GENERATED messages -->

| messageId | Text |
| --- | --- |
| `restatedPool` | A test config must not set \`pool: "forks"\`, the default pool of the test runner. Delete \`pool\`. |
| `pinnedWorkersUnderSerialFiles` | A test config must not set \`maxWorkers\` next to \`fileParallelism: false\`, which already runs a single worker. Delete \`maxWorkers\`. |

<!-- END GENERATED messages -->

## Runtime Selection

<!-- BEGIN GENERATED runtime -->

This rule runs as an oxlint JS plugin, in the same pass as every other rule the workspace ships. It reads no options. A consumer turns it on or off as a whole.

<!-- END GENERATED runtime -->
