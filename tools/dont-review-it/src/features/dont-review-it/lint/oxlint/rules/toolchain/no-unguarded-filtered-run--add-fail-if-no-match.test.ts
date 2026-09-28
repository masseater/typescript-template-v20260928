import { describe } from "vite-plus/test";

import { testLintRule } from "../../../../lint-rule-authoring/rule-tester-test-fixture.ts";
import { noUnguardedFilteredRun } from "./no-unguarded-filtered-run--add-fail-if-no-match.ts";

describe("dont-review-it/no-unguarded-filtered-run--add-fail-if-no-match", () => {
  testLintRule(noUnguardedFilteredRun, {
    valid: [
      {
        name: "arguments built by the shared helper carry the guard",
        documented: true,
        code: 'const handed = filteredRunArguments("@repo/db-local", "db:migrate:local");',
      },
      {
        name: "an argument list that already fails on an empty filter is kept",
        code: 'const handed = ["run", "--filter", workspace, "--fail-if-no-match", task];',
      },
      {
        name: "a command string that already fails on an empty filter is kept",
        code: 'const command = "vp run --filter @repo/dev --fail-if-no-match setup";',
      },
      {
        name: "filter flags handed to a run that carries the guard elsewhere are not a run",
        code: 'const filters = ["--filter", workspace];',
      },
      {
        name: "a recursive run without a filter does not narrow to a workspace",
        code: 'const command = "vp run -r prepr";',
      },
      {
        name: "a template that names the guard is kept",
        code: "const command = `exec ${vp} run --filter @repo/${app} --fail-if-no-match preview`;",
      },
      {
        name: "a test file spells commands as fixtures for other checks",
        filename: "scripts.test.ts",
        code: 'const command = "vp run --filter @repo/dev setup";',
      },
    ],
    invalid: [
      {
        name: "a spawned argument list without the guard",
        documented: true,
        code: 'run("vp", ["run", "--filter", "@repo/db-local", "db:migrate:local"]);',
        errors: [{ messageId: "unguardedFilteredRun" }],
      },
      {
        name: "a command string handed to a shell or shown to the reader",
        code: 'const script = "vp run --filter @repo/dev storybook";',
        errors: [{ messageId: "unguardedFilteredRun" }],
      },
      {
        name: "a template that interpolates the workspace",
        code: "const command = `exec ${vp} run --filter @repo/${app} preview >> ${log} 2>&1`;",
        errors: [{ messageId: "unguardedFilteredRun" }],
      },
      {
        name: "the equals form of the filter flag",
        code: 'const handed = ["run", "--filter=@repo/dev", "setup"];',
        errors: [{ messageId: "unguardedFilteredRun" }],
      },
    ],
  });
});
