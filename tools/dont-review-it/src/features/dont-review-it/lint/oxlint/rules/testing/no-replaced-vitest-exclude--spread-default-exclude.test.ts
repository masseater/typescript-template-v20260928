import { describe } from "vite-plus/test";

import { testLintRule } from "../../../../lint-rule-authoring/rule-tester-test-fixture.ts";
import { noReplacedVitestExclude } from "./no-replaced-vitest-exclude--spread-default-exclude.ts";

describe("dont-review-it/no-replaced-vitest-exclude--spread-default-exclude", () => {
  testLintRule(noReplacedVitestExclude, {
    valid: [
      {
        name: "an exclude that starts from the default exclusions passes",
        documented: true,
        code: `import { defineConfig } from "vite-plus";\nimport { defaultExclude } from "vite-plus/test/config";\nexport default defineConfig({ test: { exclude: [...defaultExclude, "**/dist/**"] } });\n`,
        filename: "vite.config.ts",
      },
      {
        name: "a test block with no exclude keeps the default and passes",
        code: `export default { test: { include: ["src/**/*.test.ts"] } };\n`,
        filename: "vite.config.ts",
      },
      {
        name: "a coverage exclude is not the test exclude",
        documented: true,
        code: `export default { test: { coverage: { exclude: ["specs/**"] } } };\n`,
        filename: "vite.config.ts",
      },
      {
        name: "an inline project that spreads the default passes",
        code: `import { defaultExclude } from "vite-plus/test/config";\nexport default { test: { projects: [{ test: { exclude: [...defaultExclude, "**/*.worker.test.ts"] } }] } };\n`,
        filename: "vite.config.ts",
      },
      {
        name: "a file that is not a test config is never looked at",
        code: `export default { test: { exclude: ["**/node_modules/**"] } };\n`,
        filename: "src/index.ts",
      },
    ],
    invalid: [
      {
        name: "an exclude that copies part of the default by hand is reported",
        documented: true,
        code: `import { defineConfig } from "vite-plus";\nexport default defineConfig({ test: { exclude: ["**/node_modules/**", "**/dist/**"] } });\n`,
        filename: "vite.config.ts",
        errors: [{ messageId: "replacedExclude" }],
      },
      {
        name: "an exclude inside an inline project that drops the default is reported",
        code: `export default { test: { projects: [{ test: { exclude: ["**/*.worker.test.ts"] } }] } };\n`,
        filename: "vite.config.ts",
        errors: [{ messageId: "replacedExclude" }],
      },
      {
        name: "an exclude handed over by a binding is reported",
        code: `import { excluded } from "./shared.ts";\nexport default { test: { exclude: excluded } };\n`,
        filename: "vitest.config.ts",
        errors: [{ messageId: "replacedExclude" }],
      },
    ],
  });
});
