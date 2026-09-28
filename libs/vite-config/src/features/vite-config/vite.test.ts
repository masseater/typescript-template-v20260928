import { applications, type Application } from "@repo/config";
import { repositoryRoot } from "@repo/config/repository-root";
import { describe, expect, test } from "vite-plus/test";

import { paths } from "./host.ts";
import { localizedApps } from "./paraglide-options.ts";
import {
  appConfig,
  appRun,
  effectRun,
  lifecycle,
  paraglideAppRun,
  sliceBoundaries,
  workspaceParaglideCompile,
} from "./vite.ts";

import type { ConfigEnv, PluginOption } from "vite-plus";

const serve = { command: "serve", isPreview: false, mode: "test" } as const satisfies ConfigEnv;

describe("lifecycle", () => {
  const it = test
    .extend("inheritedLifecycle", () => lifecycle({ prepush: ["check:effect"] }))
    .extend("declaredLifecycle", () =>
      lifecycle({ precommit: ["check:staged"], prerelease: ["verify:account"] }),
    );

  it("fills omitted stages with inherited gates only", ({ inheritedLifecycle }) => {
    expect(inheritedLifecycle).toStrictEqual({
      precommit: { command: [], dependsOn: [] },
      prepush: { command: [], dependsOn: ["precommit", "check:effect"] },
      prepr: { command: [], dependsOn: ["prepush"] },
      premerge: { command: [], dependsOn: [] },
      prerelease: { command: [], dependsOn: ["prepr", "premerge"] },
    });
  });

  it("keeps commit and release checks on the stages that declare them", ({ declaredLifecycle }) => {
    expect(declaredLifecycle).toStrictEqual({
      precommit: { command: [], dependsOn: ["check:staged"] },
      prepush: { command: [], dependsOn: ["precommit"] },
      prepr: { command: [], dependsOn: ["prepush"] },
      premerge: { command: [], dependsOn: [] },
      prerelease: { command: [], dependsOn: ["prepr", "premerge", "verify:account"] },
    });
  });
});

const libraryRoot = paths.join(repositoryRoot, "libs/db-local");
const applicationRoot = paths.join(repositoryRoot, "apps/service-admin");

describe("effectRun", () => {
  const it = test.extend("effectWorkspaceTasks", () => effectRun(libraryRoot).tasks);

  it("lints the workspace before commit", ({ effectWorkspaceTasks }) => {
    expect(effectWorkspaceTasks.precommit.dependsOn).toStrictEqual(
      expect.arrayContaining(["check:code"]),
    );
  });

  it("checks types, imports and budgets before push", ({ effectWorkspaceTasks }) => {
    expect(effectWorkspaceTasks.prepush.dependsOn).toStrictEqual(
      expect.arrayContaining(["check:effect", "check:imports", "check:modular"]),
    );
  });
});

describe("appRun", () => {
  const it = test.extend("applicationTasks", () => appRun(applicationRoot).tasks);

  it("type-checks before it builds", ({ applicationTasks }) => {
    expect(applicationTasks.build.dependsOn).toStrictEqual(
      expect.arrayContaining(["check:effect"]),
    );
  });

  it("builds before a pull request", ({ applicationTasks }) => {
    expect(applicationTasks.prepr.dependsOn).toStrictEqual(expect.arrayContaining(["build"]));
  });

  it("builds and starts before a merge", ({ applicationTasks }) => {
    expect(applicationTasks.premerge.dependsOn).toStrictEqual(
      expect.arrayContaining(["build", "check:dev"]),
    );
  });

  it("checks slices, routes, client reach and React before push", ({ applicationTasks }) => {
    expect(applicationTasks.prepush.dependsOn).toStrictEqual(
      expect.arrayContaining([
        "check:effect",
        "check:feature-sliced",
        "check:thin-app-routes",
        "check:imports",
        "check:client",
        "check:react",
      ]),
    );
  });
});

describe("paraglideAppRun", () => {
  const it = test.extend("localizedApplicationTasks", () => paraglideAppRun(applicationRoot).tasks);

  it.for(["check:effect", "check:code", "check:imports", "check:client", "check:react"])(
    "compiles message catalogs before %s",
    (gatedTask, { localizedApplicationTasks }) => {
      expect(localizedApplicationTasks[gatedTask]?.dependsOn).toStrictEqual(
        expect.arrayContaining(["typescript-template#compile:paraglide"]),
      );
    },
  );
});

describe("sliceBoundaries", () => {
  const it = test.extend("sliceChecks", () => Object.values(sliceBoundaries));

  it("leaves local state and compiled message catalogs out of the slice checks", ({
    sliceChecks,
  }) => {
    expect(sliceChecks.map((check) => check.input)).toStrictEqual(
      sliceChecks.map(() =>
        expect.arrayContaining([
          { base: "workspace", pattern: "!.local/**" },
          ...localizedApps.map((app) => ({
            base: "workspace",
            pattern: `!apps/${app}/.paraglide/**`,
          })),
        ]),
      ),
    );
  });
});

describe("workspaceParaglideCompile", () => {
  const it = test.extend("paraglideCompile", () => workspaceParaglideCompile);

  it("reads each localized application's catalogs and settings", ({ paraglideCompile }) => {
    expect(paraglideCompile.input).toStrictEqual(
      expect.arrayContaining(
        localizedApps.flatMap((app) => [
          { base: "workspace", pattern: `apps/${app}/messages/**` },
          { base: "workspace", pattern: `apps/${app}/project.inlang/settings.json` },
        ]),
      ),
    );
  });

  it("does not read the catalogs it compiles", ({ paraglideCompile }) => {
    expect(paraglideCompile.input).toStrictEqual(
      expect.arrayContaining(
        localizedApps.map((app) => ({ base: "workspace", pattern: `!apps/${app}/.paraglide/**` })),
      ),
    );
  });

  it("writes each localized application's compiled catalogs", ({ paraglideCompile }) => {
    expect(paraglideCompile.output).toStrictEqual(
      expect.arrayContaining(
        localizedApps.map((app) => ({ base: "workspace", pattern: `apps/${app}/.paraglide/**` })),
      ),
    );
  });
});

describe("appConfig", () => {
  const it = test
    .extend("pluginNamesByApplication", () => {
      const pluginNamesOf = (
        plugins: readonly PluginOption[],
        app: Application,
      ): readonly string[] =>
        plugins.flatMap((plugin): readonly string[] => {
          if (Array.isArray(plugin)) {
            return pluginNamesOf(plugin, app);
          }
          if (
            typeof plugin === "object" &&
            plugin !== null &&
            "name" in plugin &&
            typeof plugin.name === "string"
          ) {
            return [plugin.name.replaceAll(`template-${app}-dev-boundary`, "dev-boundary")];
          }
          return [];
        });
      return applications.map((app) => pluginNamesOf(appConfig(app)(serve).plugins ?? [], app));
    })
    .extend("adminPlugins", () => {
      const pluginNamesOf = (plugins: readonly PluginOption[]): readonly string[] =>
        plugins.flatMap((plugin): readonly string[] => {
          if (Array.isArray(plugin)) {
            return pluginNamesOf(plugin);
          }
          if (
            typeof plugin === "object" &&
            plugin !== null &&
            "name" in plugin &&
            typeof plugin.name === "string"
          ) {
            return [plugin.name];
          }
          return [];
        });
      return pluginNamesOf(appConfig("service-admin")(serve).plugins ?? []);
    })
    .extend("adminElysiaAotPlugins", () => {
      const pluginRecordsOf = (
        plugins: readonly PluginOption[],
      ): readonly (readonly [string, unknown])[] =>
        plugins.flatMap((plugin): readonly (readonly [string, unknown])[] => {
          if (Array.isArray(plugin)) {
            return pluginRecordsOf(plugin);
          }
          if (
            typeof plugin === "object" &&
            plugin !== null &&
            "name" in plugin &&
            typeof plugin.name === "string" &&
            plugin.name === "elysia-aot"
          ) {
            return [[plugin.name, "apply" in plugin ? plugin.apply : undefined]];
          }
          return [];
        });
      return pluginRecordsOf(appConfig("service-admin")(serve).plugins ?? []);
    })
    .extend("adminPluginsWithMarker", () => {
      const marker = { name: "app-specific" };
      const pluginNamesOf = (plugins: readonly PluginOption[]): readonly string[] =>
        plugins.flatMap((plugin): readonly string[] => {
          if (Array.isArray(plugin)) {
            return pluginNamesOf(plugin);
          }
          if (
            typeof plugin === "object" &&
            plugin !== null &&
            "name" in plugin &&
            typeof plugin.name === "string"
          ) {
            return [plugin.name];
          }
          return [];
        });
      const withMarker = pluginNamesOf(
        appConfig("service-admin", { plugins: [marker] })(serve).plugins ?? [],
      );
      return withMarker.toSpliced(withMarker.indexOf(marker.name), 1);
    });

  it("gives every application the same plugin wiring", ({ pluginNamesByApplication }) => {
    expect(pluginNamesByApplication).toStrictEqual([
      pluginNamesByApplication[0],
      pluginNamesByApplication[0],
      pluginNamesByApplication[0],
    ]);
  });

  it("inserts application plugins after the dev boundary", ({
    adminPlugins,
    adminPluginsWithMarker,
  }) => {
    expect(adminPluginsWithMarker).toStrictEqual(adminPlugins);
  });

  it("runs Elysia AOT on the admin worker while Vite is serving", ({ adminElysiaAotPlugins }) => {
    expect(adminElysiaAotPlugins).toStrictEqual([["elysia-aot", undefined]]);
  });
});
