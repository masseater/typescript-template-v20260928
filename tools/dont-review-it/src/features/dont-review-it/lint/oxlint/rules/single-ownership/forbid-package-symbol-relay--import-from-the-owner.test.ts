import { describe } from "vite-plus/test";

import { testLintRule } from "../../../../lint-rule-authoring/rule-tester-test-fixture.ts";
import { forbidPackageSymbolRelay } from "./forbid-package-symbol-relay--import-from-the-owner.ts";

describe("dont-review-it/forbid-package-symbol-relay--import-from-the-owner", () => {
  testLintRule(forbidPackageSymbolRelay, {
    valid: [
      {
        name: "exporting a symbol declared in the module passes",
        documented: true,
        code: 'import { Schema } from "effect";\nconst User = Schema.Struct({});\nexport { User };',
      },
      {
        name: "forwarding a sibling module of the same package passes",
        documented: true,
        code: 'export { parseConfig } from "./parse-config.ts";',
      },
      {
        name: "forwarding an import alias of the same package passes",
        code: 'import { session } from "#entities/session/index.ts";\nexport { session };',
      },
      {
        name: "an entry file listed in the configuration may forward a package symbol",
        filename: "/repo/apps/member/src/app/server.ts",
        options: [{ relayEntryFiles: ["apps/member/src/app/server.ts"] }],
        code: 'export { Process } from "@repo/runtime/jobs";',
      },
    ],
    invalid: [
      {
        name: "forwarding a workspace package symbol from source is reported",
        documented: true,
        code: 'export { PaidPlanRequired } from "@repo/config";',
        errors: [{ messageId: "packageSymbolRelay" }],
      },
      {
        name: "exporting an imported workspace package symbol under a new name is reported",
        documented: true,
        code: 'import { memberMcpScopes } from "@repo/config";\nexport { memberMcpScopes as memberScopes };',
        errors: [{ messageId: "packageSymbolRelay" }],
      },
      {
        name: "forwarding an external package symbol is reported",
        code: 'export { and, eq } from "drizzle-orm";',
        errors: [{ messageId: "packageSymbolRelay" }, { messageId: "packageSymbolRelay" }],
      },
      {
        name: "forwarding the whole surface of a package is reported",
        code: 'export * from "@repo/telemetry";',
        errors: [{ messageId: "packageSymbolRelay" }],
      },
      {
        name: "a file that is not listed keeps being reported",
        filename: "/repo/apps/member/src/other/server.ts",
        options: [{ relayEntryFiles: ["apps/member/src/app/server.ts"] }],
        code: 'export { Process } from "@repo/runtime/jobs";',
        errors: [{ messageId: "packageSymbolRelay" }],
      },
    ],
  });
});
