import { describe } from "vite-plus/test";

import { testLintRule } from "../../../../lint-rule-authoring/rule-tester-test-fixture.ts";
import { noConditionalInConsequentOrTest } from "./no-conditional-in-consequent-or-test--split-with-if-or-name-the-inner-value.ts";

describe("dont-review-it/no-conditional-in-consequent-or-test--split-with-if-or-name-the-inner-value", () => {
  testLintRule(noConditionalInConsequentOrTest, {
    valid: [
      {
        name: "a single conditional expression passes",
        code: "const label = ready ? 'ready' : 'waiting';",
      },
      {
        name: "a chain through the false branch reads like else if and passes",
        documented: true,
        code: "const label = ready ? 'ready' : failed ? 'failed' : 'waiting';",
      },
      {
        name: "a named inner value keeps each conditional to one level",
        documented: true,
        code: "const retried = seen >= limit ? 200 : 503;\nconst status = retrying ? retried : 204;",
      },
    ],
    invalid: [
      {
        name: "a conditional in the true branch is reported",
        documented: true,
        code: "const status = retrying ? (seen >= limit ? 200 : 503) : 204;",
        errors: [{ messageId: "nestedConditional" }],
      },
      {
        name: "a conditional in the true branch without parentheses is reported",
        code: "const status = retrying ? seen >= limit ? 200 : 503 : 204;",
        errors: [{ messageId: "nestedConditional" }],
      },
      {
        name: "a conditional in the test is reported",
        code: "const status = (ready ? primary : fallback) ? 200 : 503;",
        errors: [{ messageId: "nestedConditional" }],
      },
      {
        name: "a conditional in the true branch of a false branch link is reported",
        code: "const status = ready ? 200 : retrying ? (seen >= limit ? 200 : 503) : 204;",
        errors: [{ messageId: "nestedConditional" }],
      },
    ],
  });
});
