import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, Path } from "effect";
import * as ts from "typescript-6";
import { describe, expect, it } from "vite-plus/test";

import { path } from "../platform/path.ts";
import { overridePluginMismatches } from "./lint-test-fixture.ts";
import {
  awaitingPresetPackages,
  softPresetPackages,
  lintOptions,
  templateWorkspaces,
} from "./lint.ts";
import { repositoryRoot } from "./repository-root.ts";
import { commands, reachable, taskNames } from "./tasks-test-fixture.ts";
import { typecheckProjects } from "./typecheck-projects.ts";

const manifests: Readonly<Record<string, unknown>> = import.meta.glob(
  "../../../../../../{apps,libs,infra,tools}/*/package.json",
  { eager: true, import: "default" },
);

const tsconfigs: Readonly<Record<string, { readonly default?: unknown }>> = import.meta.glob(
  "../../../../../../{apps,libs,infra,tools}/*/tsconfig.json",
  { eager: true },
);

const nestedTsconfigs: Readonly<Record<string, { readonly default?: unknown }>> = import.meta.glob(
  "../../../../../../{apps,libs,infra,tools}/*/**/tsconfig.json",
  { eager: true },
);

const workspacePath = (key: string): string => {
  const resolved = ["tools", "dont-review-it", "src", "features", "dont-review-it", "repository"];
  for (const segment of key.split("/")) {
    if (segment === "..") {
      resolved.pop();
    } else if (segment !== ".") {
      resolved.push(segment);
    }
  }
  return resolved.join("/");
};

const workspaceDirectories = Object.keys(manifests)
  .map((key) => workspacePath(key).replace(/\/package\.json$/u, ""))
  .toSorted();

const globPrefix = (pattern: string): string => {
  const cut = pattern.indexOf("/**");
  if (cut === -1) {
    return pattern;
  }
  return pattern.slice(0, cut);
};

const missingWorkspaceGlobs = (patterns: readonly string[]): string[] => {
  const directories = new Set(workspaceDirectories);
  return patterns
    .map(globPrefix)
    .filter((prefix) => prefix.includes("/") && !directories.has(prefix))
    .toSorted();
};

const extendsValue = (config: unknown): string | undefined => {
  if (typeof config !== "object" || config === null) {
    return undefined;
  }
  const value = Reflect.get(config, "extends");
  return typeof value === "string" ? value : undefined;
};

const relativeWorkspaceExtends = (): string[] => {
  const directories = new Set(workspaceDirectories);
  return Object.entries(tsconfigs).flatMap(([key, module]) => {
    const file = workspacePath(key);
    const relative = extendsValue(module.default);
    if (relative === undefined || !relative.startsWith(".")) {
      return [];
    }
    const from = file.replace(/\/tsconfig\.json$/u, "").split("/");
    const target = [...from];
    for (const segment of relative.split("/")) {
      if (segment === "..") {
        target.pop();
      } else if (segment !== "." && !segment.endsWith(".json")) {
        target.push(segment);
      }
    }
    const landed = target.slice(0, 2).join("/");
    if (!directories.has(landed)) {
      return [];
    }
    const owner = from.slice(0, 2).join("/");
    return owner === landed ? [] : [file];
  });
};

const trackedSources: readonly string[] = Object.keys(
  import.meta.glob([
    "../../../../../../**/*.{ts,tsx}",
    "!**/.*/**",
    "!**/dist/**",
    "!**/node_modules/**",
  ]),
)
  .map(workspacePath)
  .toSorted();

const projectFiles = (
  directory: string,
  config: Readonly<Record<string, unknown>>,
): readonly string[] =>
  ts
    .parseJsonConfigFileContent(config, ts.sys, path.join(repositoryRoot, directory))
    .fileNames.map((file) => path.relative(repositoryRoot, file));

const checkedFiles = (projects: readonly string[]): ReadonlySet<string> =>
  new Set(
    projects.flatMap((project) => {
      const configPath = path.join(repositoryRoot, project);
      const read = ts.readConfigFile(configPath, (filePath) => ts.sys.readFile(filePath));
      return projectFiles(path.dirname(project), read.config);
    }),
  );

const outsideEveryProject = (
  sources: readonly string[],
  checked: ReadonlySet<string>,
): readonly string[] => sources.filter((source) => !checked.has(source));

describe("inspection coverage", () => {
  it("keeps awaiting preset packages from growing silently", () => {
    expect.hasAssertions();
    expect(awaitingPresetPackages).toStrictEqual([]);
    expect(softPresetPackages).toStrictEqual([
      "apps/service-admin/**",
      "apps/service-member/**",
      "apps/internal-dashboard/**",
      "apps/internal-wiki/**",
      "infra/cloudflare/**",
      "tools/dev/**",
      "tools/dont-review-it/**",
    ]);
  });

  it("points lint workspace globs at packages that exist", () => {
    expect.hasAssertions();
    expect(missingWorkspaceGlobs(templateWorkspaces)).toStrictEqual([]);
    expect(missingWorkspaceGlobs(awaitingPresetPackages)).toStrictEqual([]);
  });

  it("points every literal lint override path at a file in the tree", () =>
    Effect.runPromise(
      Effect.gen(function* literalOverridePathsExist() {
        expect.hasAssertions();
        const filesystem = yield* FileSystem.FileSystem;
        const paths = yield* Path.Path;
        const literalPaths = lintOptions.overrides
          .flatMap((override) => override.files ?? [])
          .filter((file) => !/[*{]/u.test(file));
        const missing = yield* Effect.forEach(literalPaths, (file) =>
          Effect.map(filesystem.exists(paths.join(repositoryRoot, file)), (exists) =>
            exists ? [] : [file],
          ),
        );
        expect(missing.flat()).toStrictEqual([]);
      }).pipe(Effect.provide(NodeServices.layer)),
    ));

  it("does not declare built-in plugin rules under an override that dropped that plugin", () => {
    expect.hasAssertions();
    expect(overridePluginMismatches(lintOptions.overrides)).toStrictEqual([]);
  });

  it("bans oxlint-disable the same way it bans eslint-disable", () => {
    expect.hasAssertions();
    const terms = lintOptions.overrides
      .flatMap((override) => Object.entries(override.rules ?? {}))
      .flatMap(([rule, setting]) =>
        rule === "no-warning-comments" && Array.isArray(setting) ? [setting[1]] : [],
      );
    expect(terms).toContainEqual(
      expect.objectContaining({
        terms: expect.arrayContaining(["eslint-disable", "oxlint-disable"]),
      }),
    );
  });

  it("keeps check:repository defined until its existing violations are cleared", () => {
    expect.hasAssertions();
    expect(taskNames(".")).toContain("check:repository");
    expect(reachable(".", ["prepush"])).not.toContain("check:repository");
    expect(reachable(".", ["premerge"])).not.toContain("check:repository");
  });

  it("typechecks every workspace even when oxlint ignorePatterns skip it", () =>
    Effect.runPromise(
      Effect.gen(function* typechecksEveryWorkspace() {
        expect.hasAssertions();
        const projects = yield* typecheckProjects(repositoryRoot);
        const discovered = [
          "tsconfig.json",
          ...Object.keys(tsconfigs).map((key) => workspacePath(key)),
          ...Object.keys(nestedTsconfigs).map((key) => workspacePath(key)),
        ]
          .filter((project, index, all) => all.indexOf(project) === index)
          .toSorted();
        const skippedByLint = discovered.filter((project) =>
          lintOptions.ignorePatterns.some((pattern) => {
            const prefix = pattern.endsWith("/**") ? pattern.slice(0, -3) : undefined;
            return prefix !== undefined && project.startsWith(`${prefix}/`);
          }),
        );
        expect(projects).toStrictEqual(discovered);
        expect(
          [
            ...new Set(
              skippedByLint.map((project) => {
                const directory = project.replace(/\/tsconfig\.json$/u, "");
                const [group = "", name = ""] = directory.split("/");
                return name === "" ? directory : `${group}/${name}`;
              }),
            ),
          ].toSorted(),
        ).toStrictEqual(
          awaitingPresetPackages.map((pattern) => pattern.replace(/\/\*\*$/u, "")).toSorted(),
        );
        expect(commands(".", "check:types")).toStrictEqual(["dont-review-it-typecheck"]);
        expect(reachable(".", ["prepush", "prepr", "premerge"])).not.toContain("check:types");
      }).pipe(Effect.provide(NodeServices.layer)),
    ));

  it("typechecks every tracked TypeScript source through some tsconfig", () =>
    Effect.runPromise(
      Effect.gen(function* everySourceTypechecked() {
        expect.hasAssertions();
        const projects = yield* typecheckProjects(repositoryRoot);
        expect(outsideEveryProject(trackedSources, checkedFiles(projects))).toStrictEqual([]);
      }).pipe(Effect.provide(NodeServices.layer)),
    ));

  it("reports sources an enumerating include leaves out", () => {
    expect.hasAssertions();
    expect(
      outsideEveryProject(
        [
          "apps/core/alchemy.run.ts",
          "libs/auth-ui/storybook/preview.tsx",
          "libs/ui/design-system.test.ts",
          "vitest.workers.main.ts",
        ],
        new Set([
          ...projectFiles("apps/core", { include: ["src/**/*.ts", "vite.config.ts"] }),
          ...projectFiles("libs/auth-ui", {
            include: ["src/**/*.ts", "src/**/*.tsx", "vite.config.ts"],
          }),
          ...projectFiles("libs/ui", {
            include: ["storybook/**/*.ts", "storybook/**/*.tsx", "src/**/*.ts", "src/**/*.tsx"],
          }),
          ...projectFiles(".", {
            include: ["vite.config.ts", "vitest.mutation.config.ts", "vitest.workers.config.ts"],
          }),
        ]),
      ),
    ).toStrictEqual([
      "apps/core/alchemy.run.ts",
      "libs/auth-ui/storybook/preview.tsx",
      "libs/ui/design-system.test.ts",
      "vitest.workers.main.ts",
    ]);
  });

  it("does not extend another workspace tsconfig through a relative path", () => {
    expect.hasAssertions();
    expect(relativeWorkspaceExtends()).toStrictEqual([]);
  });

  it("turns import/no-default-export off in favor of the named-export rule", () => {
    expect.hasAssertions();
    expect(lintOptions.rules["import/no-default-export"]).toBe("off");
  });
});
