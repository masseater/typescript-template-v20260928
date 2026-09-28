import { describe, expect, test } from "vite-plus/test";

import { isRecord } from "../dependency-catalog/record-fields.ts";
import { dependencies } from "./tasks-test-fixture.ts";
import { rootNodeTestIncludes } from "./tool-test-projects.ts";
import { jobOf, stepsOf, workflowNamed } from "./workflows-test-fixture.ts";

describe("the pull request check", () => {
  const it = test.extend("checkWorkflow", () => workflowNamed("check.yml"));

  it("runs prepr at the root after fetching the head commit, and in the affected workspaces", ({
    checkWorkflow,
  }) => {
    expect(
      (jobOf(checkWorkflow, "check-shard").steps ?? []).flatMap((step) =>
        step.if === "steps.affected.outputs.root == 'true'" ||
        step.if === "steps.affected.outputs.filters != ''"
          ? [{ if: step.if, run: step.run }]
          : [],
      ),
    ).toStrictEqual([
      {
        if: "steps.affected.outputs.root == 'true'",
        run: "git fetch --no-tags --depth=2 origin ${{ github.sha }}",
      },
      { if: "steps.affected.outputs.root == 'true'", run: "vp run -w prepr" },
      {
        if: "steps.affected.outputs.filters != ''",
        run: "vp run --fail-if-no-match $AFFECTED_FILTERS prepr",
      },
    ]);
  });

  it("does not narrow what it checks by changed files, path filters or a shallow checkout", ({
    checkWorkflow,
  }) => {
    const steps = stepsOf(checkWorkflow);
    expect({
      changedFlags: steps.flatMap((step) =>
        (step.run ?? "").split(/\s+/u).filter((token) => token.startsWith("--changed")),
      ),
      fetchDepths: steps.flatMap((step) =>
        step.with !== undefined && "fetch-depth" in step.with ? [step.with["fetch-depth"]] : [],
      ),
      pathFilters: Object.values(checkWorkflow.on).flatMap((trigger) =>
        isRecord(trigger)
          ? Object.keys(trigger).filter((key) => key === "paths" || key === "paths-ignore")
          : [],
      ),
      wholeRepositoryChecks: steps.filter((step) => step.run === "vp check").length,
    }).toStrictEqual({ changedFlags: [], fetchDepths: [], pathFilters: [], wholeRepositoryChecks: 0 });
  });

  it("records a stuck shard as a failure before the runner sits pending", ({ checkWorkflow }) => {
    const shard = jobOf(checkWorkflow, "check-shard");
    const check = jobOf(checkWorkflow, "check");
    expect({
      checkNeeds: check.needs,
      checkRunsAlways: check.if?.startsWith("${{ always() ") ?? false,
      shardTimeoutMinutes: shard["timeout-minutes"],
    }).toStrictEqual({
      checkNeeds: ["check-shard"],
      checkRunsAlways: true,
      shardTimeoutMinutes: 15,
    });
  });
});

describe("the merge queue", () => {
  test("runs the dev-server and storybook suites through premerge", () => {
    expect(dependencies(".", "premerge")).toStrictEqual(
      expect.arrayContaining(["test:dev-server", "test:storybook"]),
    );
  });
});

describe("the root node test projects", () => {
  test("include the tests of apps, infra and libs", () => {
    expect(rootNodeTestIncludes).toStrictEqual(
      expect.arrayContaining(["apps/**/*.test.ts", "infra/**/*.test.ts", "libs/**/*.test.ts"]),
    );
  });
});

describe("the task cache", () => {
  const it = test.extend("workflows", () => ({
    check: workflowNamed("check.yml"),
    load: workflowNamed("load.yml"),
  }));

  it("is restored only from main or the pull request base", ({ workflows }) => {
    const restoreKeys = [workflows.check, workflows.load].flatMap((workflow) =>
      stepsOf(workflow).flatMap((step) => {
        const keys = step.with?.["restore-keys"];
        return typeof keys === "string" ? keys.trim().split(/\n\s*/u) : [];
      }),
    );
    expect(restoreKeys.length).toBeGreaterThan(0);
    expect(
      restoreKeys.filter((key) => !/-main-|github\.event\.pull_request\.base\.sha/u.test(key)),
    ).toStrictEqual([]);
  });

  it("is saved from main under the pushed commit, only when nothing was restored exactly", ({
    workflows,
  }) => {
    const cache = jobOf(workflows.check, "cache");
    const steps = cache.steps ?? [];
    expect({
      hasCondition: cache.if !== undefined,
      restoredKey: steps.find((step) => step.id === "vite-task-cache")?.with?.["key"],
      saveCondition: steps.find((step) => step.uses?.startsWith("actions/cache/save@") === true)
        ?.if,
      timeoutMinutes: cache["timeout-minutes"],
    }).toStrictEqual({
      hasCondition: true,
      restoredKey: "vite-task-${{ runner.os }}-${{ runner.arch }}-main-${{ github.sha }}",
      saveCondition: "${{ always() && steps.vite-task-cache.outputs.cache-hit != 'true' }}",
      timeoutMinutes: 30,
    });
  });

  it("is saved from a pull request shard only when that shard ran a task", ({ workflows }) => {
    const saveConditions = (jobOf(workflows.check, "check-shard").steps ?? []).flatMap((step) =>
      step.uses?.startsWith("actions/cache/save@") === true ? [step.if ?? ""] : [],
    );
    expect(saveConditions).toStrictEqual([expect.stringContaining("steps.affected.outputs.")]);
  });
});
