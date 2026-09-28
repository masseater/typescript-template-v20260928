import { repositoryRoot } from "@repo/config/repository-root";
import { Effect } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { awaitingEffectDiagnostics, effectDiagnostics } from "./effect-tsgo.ts";
import { baselinePath } from "./effect-typecheck.ts";
import { filesystem, paths } from "./host.ts";

const typeScriptSources = (directory: string) => ({
  base: "workspace",
  pattern: `${directory}/**/*.{ts,tsx}`,
});

describe("effectDiagnostics", () => {
  const it = test
    .extend("libraryInput", () =>
      effectDiagnostics(paths.join(repositoryRoot, "libs/db-local"))["check:effect"].input)
    .extend("rootInput", () => effectDiagnostics(repositoryRoot)["check:effect"].input);

  it("names the sources of the package and of the workspace packages it depends on", ({
    libraryInput,
  }) => {
    expect(libraryInput).toStrictEqual(
      expect.arrayContaining([typeScriptSources("libs/db-local"), typeScriptSources("libs/db")]),
    );
  });

  it("leaves out the sources of a workspace package it does not depend on", ({ libraryInput }) => {
    expect(libraryInput).not.toContainEqual(typeScriptSources("apps/service-admin"));
  });

  it("leaves the package root listing out of a nested package", ({ libraryInput }) => {
    expect(libraryInput).toContainEqual({ base: "package", pattern: "!." });
  });

  it("excludes the nested packages the root does not depend on", ({ rootInput }) => {
    expect(rootInput).toContainEqual({ base: "workspace", pattern: "!apps/service-admin/**" });
  });

  it("keeps the root listing that `!.` would turn into every path", ({ rootInput }) => {
    expect(rootInput).not.toContainEqual({ base: "package", pattern: "!." });
  });
});

describe("awaitingEffectDiagnostics", () => {
  const it = test
    .extend("awaitingInput", () =>
      awaitingEffectDiagnostics(paths.join(repositoryRoot, "apps/service-admin"))["check:effect"]
        .input)
    .extend("baselineExists", () => Effect.runPromise(filesystem.exists(baselinePath)));

  it("adds the typecheck baseline it compares against to the inputs", ({ awaitingInput }) => {
    expect(awaitingInput).toContainEqual({
      base: "workspace",
      pattern: "libs/vite-config/src/features/vite-config/effect-typecheck-baseline.json",
    });
  });

  it("still names the sources of the package it checks", ({ awaitingInput }) => {
    expect(awaitingInput).toContainEqual(typeScriptSources("apps/service-admin"));
  });

  it("points at a baseline that exists", ({ baselineExists }) => {
    expect(baselineExists).toBe(true);
  });
});
