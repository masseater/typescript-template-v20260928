import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, Path } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { directoryEntries, type TreeFailure } from "../platform/directory-entries.ts";
import { repositoryRoot } from "./repository-root.ts";
import { dependencies, rootTestProjects } from "./tasks-test-fixture.ts";
import {
  isolatedNodeTestSuffix,
  isolatedNodeTests,
  prCheckRootShard,
  prCheckShardCount,
} from "./test-runtime.ts";
import { rootNodeTestIncludes } from "./tool-test-projects.ts";
import { jobOf, workflowNamed } from "./workflows-test-fixture.ts";

type TreeScan<Scanned> = Effect.Effect<Scanned, TreeFailure, FileSystem.FileSystem | Path.Path>;

const repositoryText = (file: string): TreeScan<string> =>
  Effect.gen(function* repositoryText() {
    const filesystem = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    return yield* filesystem.readFileString(paths.join(repositoryRoot, file));
  });

const fakeTimerCall = /\b(?:vi|jest)\.useFakeTimers\b|\bsetSystemTime\b/u;
const moduleMockCall = /^(?:await\s+)?vi\.(?:mock|doMock)\(/mu;

const collectTestFiles = (directory: string): TreeScan<string[]> =>
  Effect.gen(function* scanTestFiles() {
    const paths = yield* Path.Path;
    const entries = yield* directoryEntries(directory);
    const found = yield* Effect.forEach(entries, (entry): TreeScan<string[]> => {
      const next = paths.join(directory, entry.name);
      if (entry.kind === "directory") {
        return entry.name === "node_modules" || entry.name === "dist"
          ? Effect.succeed([])
          : collectTestFiles(next);
      }
      return Effect.succeed(
        /\.test\.tsx?$/u.test(entry.name) && !entry.name.includes(".worker.test.") ? [next] : [],
      );
    });
    return found.flat();
  });

const offendingTestFiles = (
  roots: readonly string[],
  offends: (file: string) => boolean,
  matches: RegExp,
): TreeScan<string[]> =>
  Effect.gen(function* offendingTestFiles() {
    const filesystem = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const found = yield* Effect.forEach(roots, (root) =>
      collectTestFiles(paths.join(repositoryRoot, root)),
    );
    const candidates = found.flat().filter(offends);
    const offenders = yield* Effect.filter(candidates, (file) =>
      Effect.map(filesystem.readFileString(file), (source) => matches.test(source)),
    );
    return offenders.map((file) => paths.relative(repositoryRoot, file)).toSorted();
  });

describe("vitest isolation and sharding", () => {
  it("shares the node module graph and keeps an isolated opt-out project", () => {
    expect.hasAssertions();
    const node = rootTestProjects.find((project) => project.name === "node");
    const isolated = rootTestProjects.find((project) => project.name === "node-isolated");
    expect(node).toMatchObject({
      exclude: expect.arrayContaining([isolatedNodeTests]),
      include: [...rootNodeTestIncludes],
      isolate: false,
    });
    expect(isolated?.include).toStrictEqual(
      rootNodeTestIncludes.map(() => expect.stringContaining(".isolated.test.")),
    );
    expect(isolated?.isolate).toBeUndefined();
  });

  it("runs one pull request check shard per matrix entry", () => {
    expect.hasAssertions();
    const shard = jobOf(workflowNamed("check.yml"), "check-shard");
    expect(shard.strategy?.matrix.shard).toStrictEqual([
      prCheckRootShard,
      ...Array.from({ length: prCheckShardCount }, (_unused, index) => index + 1),
    ]);
    expect(
      (shard.steps ?? []).find((step) => step.id === "affected")?.env?.["CHECK_SHARD"],
    ).toBe("${{ matrix.shard }}");
  });

  it("splits the merge-queue unit suite into as many shards as its matrix has entries", () => {
    expect.hasAssertions();
    const unit = jobOf(workflowNamed("check.yml"), "merge-queue-unit");
    const shards = unit.strategy?.matrix.shard ?? [];
    const denominators = (unit.steps ?? []).flatMap((step) =>
      [...(step.run ?? "").matchAll(/--shard=\$\{\{ matrix\.shard \}\}\/(?<total>\d+)/gu)].map(
        (matched) => Number(matched.groups?.["total"]),
      ),
    );
    expect({ denominators, shards }).toStrictEqual({
      denominators: [shards.length],
      shards: Array.from({ length: shards.length }, (_unused, index) => index + 1),
    });
  });

  it("waits for the package premerge and the unit shards before the merge queue passes", () => {
    expect.hasAssertions();
    expect(jobOf(workflowNamed("check.yml"), "merge-queue").needs).toStrictEqual([
      "merge-queue-packages",
      "merge-queue-unit",
    ]);
  });

  it("keeps fake timers out of the shared node project", () =>
    Effect.runPromise(
      Effect.gen(function* fakeTimersKeptOut() {
        expect.hasAssertions();
        const paths = yield* Path.Path;
        const offenders = yield* offendingTestFiles(
          ["apps", "libs", "infra", "tools"],
          (file) =>
            !file.endsWith(isolatedNodeTestSuffix) &&
            !file.includes(`${paths.sep}specs${paths.sep}`),
          fakeTimerCall,
        );
        expect(offenders).toStrictEqual([]);
      }).pipe(Effect.provide(NodeServices.layer)),
    ));

  it("runs dont-review-it's shared and isolated suites as parts of its test task", () => {
    expect.hasAssertions();
    expect(dependencies("tools/dont-review-it", "test")).toStrictEqual(
      expect.arrayContaining(["test:shared", "test:isolated"]),
    );
  });

  it("keeps module mocks out of the shared module graph", () =>
    Effect.runPromise(
      Effect.gen(function* moduleMocksKeptOut() {
        expect.hasAssertions();
        const offenders = yield* offendingTestFiles(
          ["apps", "libs", "infra", "tools/dont-review-it"],
          (file) => !file.endsWith(isolatedNodeTestSuffix) && !file.includes(".dev-server.test."),
          moduleMockCall,
        );
        expect(offenders).toStrictEqual([]);
      }).pipe(Effect.provide(NodeServices.layer)),
    ));
});
