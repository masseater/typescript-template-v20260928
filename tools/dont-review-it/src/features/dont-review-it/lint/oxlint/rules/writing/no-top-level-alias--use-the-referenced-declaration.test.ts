import { describe } from "vite-plus/test";

import { testLintRule } from "../../../../lint-rule-authoring/rule-tester-test-fixture.ts";
import { noTopLevelAlias } from "./no-top-level-alias--use-the-referenced-declaration.ts";

describe("dont-review-it/no-top-level-alias--use-the-referenced-declaration", () => {
  testLintRule(noTopLevelAlias, {
    valid: [
      {
        name: "a type that applies type arguments passes",
        documented: true,
        code: "type Ids = ReadonlyArray<string>;",
      },
      {
        name: "a type derived from a schema passes",
        code: "type User = typeof User.Type;",
      },
      {
        name: "a generic type alias passes",
        code: "type Box<Value> = Wrapper<Value>;",
      },
      {
        name: "a schema built from another schema passes",
        documented: true,
        code: "const UserList = Schema.Array(User);",
      },
      {
        name: "a lowercase value alias passes",
        code: "const limit = defaultLimit;",
      },
      {
        name: "a constant that names a shared constant passes",
        code: "const quietPeriod = MILLISECONDS_PER_DAY;",
      },
      {
        name: "an alias inside a function body passes",
        code: "const build = () => {\n  const Local = User;\n  return Local;\n};",
      },
    ],
    invalid: [
      {
        name: "a type alias of one type reference is reported",
        documented: true,
        code: "type Session = SessionView;",
        errors: [{ messageId: "topLevelAlias" }],
      },
      {
        name: "an exported type alias of a qualified type is reported",
        code: "export type Flusher = OtlpExporter.Flusher;",
        errors: [{ messageId: "topLevelAlias" }],
      },
      {
        name: "a const that renames a schema is reported",
        documented: true,
        code: "const StaffRemoved = ResourceId;",
        errors: [{ messageId: "topLevelAlias" }],
      },
      {
        name: "an exported const that renames a class is reported",
        code: "export const Store = FileStore;",
        errors: [{ messageId: "topLevelAlias" }],
      },
    ],
  });
});
