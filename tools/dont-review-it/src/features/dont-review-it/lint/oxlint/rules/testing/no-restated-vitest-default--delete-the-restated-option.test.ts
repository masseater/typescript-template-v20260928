import { describe } from "vite-plus/test";

import { testLintRule } from "../../../../lint-rule-authoring/rule-tester-test-fixture.ts";
import { noRestatedVitestDefault } from "./no-restated-vitest-default--delete-the-restated-option.ts";

describe("dont-review-it/no-restated-vitest-default--delete-the-restated-option", () => {
  testLintRule(noRestatedVitestDefault, {
    valid: [
      {
        name: "a pool other than the default passes",
        documented: true,
        code: `import { defineConfig } from "vite-plus";\nexport default defineConfig({ test: { pool: "threads" } });\n`,
        filename: "vite.config.ts",
      },
      {
        name: "files run one at a time without a worker count passes",
        documented: true,
        code: `export default { test: { fileParallelism: false } };\n`,
        filename: "vite.config.ts",
      },
      {
        name: "a worker count while files run in parallel passes",
        code: `export default { test: { fileParallelism: true, maxWorkers: 2 } };\n`,
        filename: "vite.config.ts",
      },
      {
        name: "a worker count without a word on file parallelism passes",
        code: `export default { test: { maxWorkers: 2 } };\n`,
        filename: "vite.config.ts",
      },
      {
        name: "the pool outside the test block is not the option the run reads",
        code: `export default { pool: "forks", test: {} };\n`,
        filename: "vite.config.ts",
      },
      {
        name: "a file that is not a test config is never looked at",
        code: `export default { test: { pool: "forks" } };\n`,
        filename: "src/index.ts",
      },
      {
        name: "a project given by path is left alone",
        code: `export default { test: { projects: ["./vitest.workers.config.ts"] } };\n`,
        filename: "vite.config.ts",
      },
    ],
    invalid: [
      {
        name: "the default pool spelled out is reported",
        documented: true,
        code: `import { defineConfig } from "vite-plus";\nexport default defineConfig({ test: { pool: "forks" } });\n`,
        filename: "vite.config.ts",
        errors: [{ messageId: "restatedPool" }],
      },
      {
        name: "a worker count next to files running one at a time is reported",
        documented: true,
        code: `export default { test: { fileParallelism: false, maxWorkers: 1 } };\n`,
        filename: "vite.config.ts",
        errors: [{ messageId: "pinnedWorkersUnderSerialFiles" }],
      },
      {
        name: "both restated options in one block are reported each",
        code: `export default { test: { fileParallelism: false, maxWorkers: 1, pool: "forks" } };\n`,
        filename: "vitest.config.ts",
        errors: [{ messageId: "pinnedWorkersUnderSerialFiles" }, { messageId: "restatedPool" }],
      },
      {
        name: "the default pool inside an inline project is reported",
        code: `export default { test: { projects: [{ test: { name: "node", pool: "forks" } }] } };\n`,
        filename: "vite.config.ts",
        errors: [{ messageId: "restatedPool" }],
      },
    ],
  });
});
