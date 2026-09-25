import { Result } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { listedPackageParents } from "./workspace-members.ts";

const definition = "/workspace/pnpm-workspace.yaml";

describe("listedPackageParents", () => {
  const it = test
    .extend("listed", () =>
      listedPackageParents({
        definition,
        definitionYaml: "packages:\n  - apps/*\n  - libs/*\n  - tools/*\n",
      }))
    .extend("unsupportedPattern", () =>
      Result.try({
        catch: (thrown) => (thrown instanceof Error ? thrown.message : "not an error"),
        try: () =>
          listedPackageParents({ definition, definitionYaml: "packages:\n  - packages/**\n" }),
      }),
    )
    .extend("missingPackages", () =>
      Result.try({
        catch: (thrown) => (thrown instanceof Error ? thrown.message : "not an error"),
        try: () => listedPackageParents({ definition, definitionYaml: "overrides: {}\n" }),
      }),
    );

  it("lists the parent directory of every <directory>/* package pattern in order", ({ listed }) => {
    expect(listed).toStrictEqual(["apps", "libs", "tools"]);
  });

  it("refuses a package pattern other than <directory>/*", ({ unsupportedPattern }) => {
    expect(unsupportedPattern).toStrictEqual(
      Result.fail(
        `${definition} does not list the workspace packages: packages/** is not a <directory>/* package pattern`,
      ),
    );
  });

  it("refuses a definition without a packages list", ({ missingPackages }) => {
    expect(missingPackages).toStrictEqual(
      Result.fail(
        `${definition} does not list the workspace packages: it does not list packages as strings`,
      ),
    );
  });
});
