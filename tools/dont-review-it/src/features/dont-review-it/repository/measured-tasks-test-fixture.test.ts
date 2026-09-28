import { measured, taskInput } from "@repo/vite-config";
import { describe, expect, it } from "vite-plus/test";

import {
  partialTaskInputTasks,
  unmeasuredTasks,
  wildcardEnvTasks,
} from "./measured-tasks-test-fixture.ts";
import { configuredDirectories, workspaceTasks } from "./tasks-test-fixture.ts";

describe("cached tasks", () => {
  it("are reported when they would run without the telemetry settings", () => {
    expect(
      unmeasuredTasks({
        bare: "vp test run",
        steps: ["vp check", "vp test run"],
        cached: { command: "vp test run" },
        partly: { command: "vp test run", env: ["MST_TELEMETRY"] },
        uncached: { cache: false, command: "vp dev" },
        stage: { command: [], dependsOn: ["check:code"] },
      }),
    ).toStrictEqual(["bare", "steps", "cached", "partly"]);
  });

  it("are left alone once measured", () => {
    expect(
      unmeasuredTasks(
        measured({
          bare: "vp test run",
          cached: { command: "vp test run", env: ["CI"] },
          uncached: { cache: false, command: "vp dev" },
        }),
      ),
    ).toStrictEqual([]);
  });

  it("hand every repository task the telemetry settings", () => {
    expect(
      configuredDirectories.flatMap((directory) =>
        unmeasuredTasks(workspaceTasks[directory] ?? {}).map((name) => `${directory}#${name}`),
      ),
    ).toStrictEqual([]);
  });
});

describe("cached task environment", () => {
  it("is reported when a wildcard lets unnamed variables through", () => {
    expect(
      wildcardEnvTasks({
        bare: "vp test run",
        broad: { command: "vp test run", env: ["CLOUDFLARE_*"] },
        untracked: { command: "vp test run", untrackedEnv: ["*"] },
        single: { command: "vp test run", env: ["APP_?"] },
        named: { command: "vp test run", env: ["CI"], untrackedEnv: ["HOME"] },
        telemetry: { command: "vp test run", env: ["OTEL_*"] },
        uncached: { cache: false, command: "vp dev" },
      }),
    ).toStrictEqual(["broad CLOUDFLARE_*", "untracked *", "single APP_?"]);
  });

  it("names every variable a repository task passes", () => {
    expect(
      configuredDirectories.flatMap((directory) =>
        wildcardEnvTasks(workspaceTasks[directory] ?? {}).map((entry) => `${directory}#${entry}`),
      ),
    ).toStrictEqual([]);
  });
});

describe("automatically tracked task input", () => {
  it("is reported when it drops the shared exclusions", () => {
    expect(
      partialTaskInputTasks({
        bare: "vp test run",
        own: { command: "drizzle-kit check", input: [{ auto: true }, "!node_modules/.cache/**"] },
        shared: { command: "vp test run", input: [...taskInput, "!coverage/**"] },
        listed: { command: "vp test run", input: ["src/**"] },
        untracked: { command: "vp test run" },
      }),
    ).toStrictEqual(["own"]);
  });

  it("spreads the shared input in every repository task that tracks automatically", () => {
    expect(
      configuredDirectories.flatMap((directory) =>
        partialTaskInputTasks(workspaceTasks[directory] ?? {}).map(
          (name) => `${directory}#${name}`,
        ),
      ),
    ).toStrictEqual([]);
  });
});
