import { NodeServices } from "@effect/platform-node";
import { Effect } from "effect";
import { describe, expect, it } from "vite-plus/test";

import {
  repositoryUnconsumedExportFindings,
  unconsumedExportFindings,
} from "./package-entries-test-fixture.ts";

import type { WorkspaceManifest } from "./dependencies-test-fixture.ts";
import type { SourceText } from "./single-consumer-test-fixture.ts";

const shared = (manifest: Readonly<Record<string, unknown>> = {}): WorkspaceManifest => ({
  area: "libs",
  file: "libs/shared/package.json",
  manifest: {
    exports: {
      ".": "./src/index.ts",
      "./testing": "./src/shared-test-fixture.ts",
      "./styles.css": "./src/styles.css",
    },
    name: "@repo/shared",
    private: true,
    ...manifest,
  },
});

const source = (file: string, text: string): SourceText => ({ file, text });

const sharedSources = [
  source(
    "libs/shared/src/index.ts",
    'export { used, testedOnly } from "./values.ts";\nexport * from "./more.ts";\nexport type { Shape } from "./values.ts";\n',
  ),
  source(
    "libs/shared/src/values.ts",
    "export const used = 1;\nexport const testedOnly = 2;\nexport type Shape = { readonly used: number };\n",
  ),
  source("libs/shared/src/more.ts", "export const starred = 3;\n"),
  source("libs/shared/src/shared-test-fixture.ts", "export const fixture = 4;\n"),
];

const findingIds = (
  sources: readonly SourceText[],
  workspace: WorkspaceManifest = shared(),
): readonly string[] =>
  unconsumedExportFindings([workspace], [...sharedSources, ...sources]).map(
    (finding) => finding.id,
  );

describe("unconsumed export findings", () => {
  it("reports every export that no file outside the package imports", () => {
    expect.hasAssertions();
    expect(findingIds([])).toStrictEqual([
      "@repo/shared/testing#fixture",
      "@repo/shared#Shape",
      "@repo/shared#starred",
      "@repo/shared#testedOnly",
      "@repo/shared#used",
    ]);
  });

  it("counts a test only as a consumer of a test fixture entry", () => {
    expect.hasAssertions();
    expect(
      findingIds([
        source(
          "apps/one/src/app.ts",
          'import { used, type Shape } from "@repo/shared";\nexport { starred } from "@repo/shared";\n',
        ),
        source(
          "apps/one/src/app.test.ts",
          'import { testedOnly } from "@repo/shared";\nimport { fixture } from "@repo/shared/testing";\n',
        ),
      ]),
    ).toStrictEqual(["@repo/shared#testedOnly"]);
  });

  it("ignores imports from inside the package itself", () => {
    expect.hasAssertions();
    expect(
      findingIds([
        source("libs/shared/src/cli.ts", 'import { testedOnly } from "@repo/shared";\n'),
      ]),
    ).toContain("@repo/shared#testedOnly");
  });

  it("treats a namespace import and a loaded module as consuming every export", () => {
    expect.hasAssertions();
    expect(
      findingIds([
        source("apps/one/src/app.ts", 'import * as shared from "@repo/shared";\n'),
        source("apps/two/src/app.ts", 'const loaded = await import("@repo/shared/testing");\n'),
      ]),
    ).toStrictEqual([]);
  });

  it("does not read a package name written as plain data as an import", () => {
    expect.hasAssertions();
    expect(
      findingIds([source("tools/check/src/list.ts", 'const packages = ["@repo/shared"];\n')]),
    ).toHaveLength(5);
  });

  it("keeps a type that the signature of another export names", () => {
    expect.hasAssertions();
    expect(
      findingIds([
        source(
          "libs/shared/src/more.ts",
          "export type Options = { readonly size: number };\nexport const starred = (options: Options) => options.size;\n",
        ),
        source("libs/shared/src/index.ts", 'export * from "./more.ts";\n'),
      ]),
    ).toStrictEqual(["@repo/shared/testing#fixture", "@repo/shared#starred"]);
  });

  it("skips a package that is published", () => {
    expect.hasAssertions();
    expect(findingIds([], shared({ private: false }))).toStrictEqual([]);
  });
});

describe("repository package export consumers", () => {
  it("reports no private package export without a consumer outside tests", () =>
    Effect.runPromise(
      Effect.gen(function* noUnconsumedExports() {
        expect.hasAssertions();
        const findings = yield* repositoryUnconsumedExportFindings;
        expect(findings.map((finding) => finding.message)).toStrictEqual([]);
      }).pipe(Effect.provide(NodeServices.layer)),
    ));
});
