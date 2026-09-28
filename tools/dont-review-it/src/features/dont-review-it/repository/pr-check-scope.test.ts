import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, Path, Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";
import { parse } from "yaml";

import { repositoryRoot } from "./repository-root.ts";
import { rootNodeTestIncludes } from "./tool-test-projects.ts";

const repositoryText = (file: string) =>
  Effect.gen(function* repositoryText() {
    const filesystem = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    return yield* filesystem.readFileString(paths.join(repositoryRoot, file));
  }).pipe(Effect.provide(NodeServices.layer));

const CacheStep = Schema.Struct({
  id: Schema.optionalKey(Schema.String),
  uses: Schema.optionalKey(Schema.String),
  with: Schema.optionalKey(
    Schema.Struct({
      key: Schema.optionalKey(Schema.String),
      "restore-keys": Schema.optionalKey(Schema.String),
    }),
  ),
});
const CachingWorkflow = Schema.Struct({
  jobs: Schema.Record(
    Schema.String,
    Schema.Struct({ steps: Schema.optionalKey(Schema.Array(CacheStep)) }),
  ),
});

const workflowJobs = Effect.gen(function* workflowJobs() {
  const filesystem = yield* FileSystem.FileSystem;
  const paths = yield* Path.Path;
  const directory = paths.join(repositoryRoot, ".github/workflows");
  const files = (yield* filesystem.readDirectory(directory)).filter((file) =>
    /\.ya?ml$/u.test(file),
  );
  const workflows = yield* Effect.forEach(files, (file) =>
    Effect.map(filesystem.readFileString(paths.join(directory, file)), (source) =>
      Schema.decodeUnknownSync(CachingWorkflow)(parse(source)),
    ),
  );
  return workflows.flatMap((workflow) =>
    Object.entries(workflow.jobs).map(([job, { steps = [] }]) => ({ job, steps })),
  );
}).pipe(Effect.provide(NodeServices.layer));

describe("pull request check scope", () => {
  it("runs downstream tests and import boundaries without --changed", () =>
    Effect.runPromise(
      Effect.gen(function* downstreamWithoutChanged() {
        expect.hasAssertions();
        const workflow = yield* repositoryText(".github/workflows/check.yml");
        const vite = yield* repositoryText("vite.config.ts");
        expect(workflow).toContain("vp run -r prepr");
        expect(workflow).toContain("vp run -r premerge");
        expect(workflow).toContain("pr-affected");
        expect(workflow).toContain("--fail-if-no-match");
        expect(workflow).not.toContain("--changed");
        expect(workflow).not.toContain("fetch-depth:");
        expect(workflow).toContain(
          "      - if: steps.affected.outputs.root == 'true'\n        run: git fetch --no-tags --depth=2 origin ${{ github.sha }}\n      - if: steps.affected.outputs.root == 'true'\n        run: vp run -w prepr\n",
        );
        expect(workflow).not.toContain("paths-ignore");
        expect(workflow).not.toContain("paths:");
        expect(workflow).not.toMatch(/^ {6}run: vp check$/mu);
        expect(vite).toContain('premerge: ["test:dev-server", "test:storybook"]');
        expect(vite).toContain("isolate: false");
        expect(vite).toContain('name: "node-isolated"');
        expect(vite).toContain("include: [...rootNodeTestIncludes]");
        expect(rootNodeTestIncludes).toContain("apps/**/*.test.ts");
        expect(rootNodeTestIncludes).toContain("infra/**/*.test.ts");
        expect(rootNodeTestIncludes).toContain("libs/**/*.test.ts");
        expect(workflow).toContain("--shard=${{ matrix.shard }}/4");
        expect(workflow).toContain("shard: [1, 2, 3, 4]");
        expect(workflow).toContain("merge-queue-unit:");
        expect(workflow).toContain("merge-queue-packages:");
      }),
    ));

  it("restores the task cache from main instead of whichever cache was saved last", () =>
    Effect.runPromise(
      Effect.gen(function* taskCacheFromMain() {
        expect.hasAssertions();
        const workflows = yield* Effect.forEach(
          [".github/workflows/check.yml", ".github/workflows/load.yml"],
          repositoryText,
        );
        const restoreKeys = workflows.flatMap((workflow) =>
          [...workflow.matchAll(/restore-keys: \|\n((?: {12}.+\n)+)/gu)].flatMap(([, keys = ""]) =>
            keys.trim().split(/\n\s*/u),
          ),
        );
        expect(restoreKeys.length).toBeGreaterThan(0);
        for (const key of restoreKeys) {
          expect(key).toMatch(/-main-|github\.event\.pull_request\.base\.sha/u);
        }
        const [check = ""] = workflows;
        expect(check).toContain(
          "key: vite-task-${{ runner.os }}-${{ runner.arch }}-main-${{ github.sha }}",
        );
        expect(check).toMatch(/cache\/save@.+\n {8}if: .*steps\.affected\.outputs\./u);
        expect(check).toMatch(
          /^ {2}cache:\n {4}if: .+\n {4}runs-on: .+\n {4}timeout-minutes: 30$/mu,
        );
        expect(check).toMatch(
          /cache\/save@.+\n {8}if: \$\{\{ always\(\) && steps\.vite-task-cache\.outputs\.cache-hit != 'true' \}\}\n/u,
        );
      }),
    ));

  it("saves the task cache only under a key that a later run looks up", () =>
    Effect.runPromise(
      Effect.gen(function* savedCachesRestored() {
        expect.hasAssertions();
        const jobs = yield* workflowJobs;
        const cacheSteps = jobs.flatMap(({ job, steps }) =>
          steps
            .filter((step) => step.uses?.startsWith("actions/cache") === true)
            .map((step) => ({ job, step, steps })),
        );
        const lookups = cacheSteps.flatMap(({ step }) => [
          ...(step.with?.["restore-keys"] ?? "")
            .split("\n")
            .map((key) => key.trim())
            .filter((key) => key !== ""),
          ...(step.uses?.startsWith("actions/cache/save@") === true ||
          (step.with?.key ?? "").includes("github.run_id")
            ? []
            : [step.with?.key ?? ""]),
        ]);
        const saved = cacheSteps
          .filter(({ step }) => step.uses?.startsWith("actions/cache/restore@") !== true)
          .map(({ job, step, steps }) => {
            const key = step.with?.key ?? "";
            const [, restoredBy] =
              /^\$\{\{ steps\.(?<id>[\w-]+)\.outputs\.cache-primary-key \}\}$/u.exec(key) ?? [];
            return {
              job,
              key:
                restoredBy === undefined
                  ? key
                  : (steps.find((candidate) => candidate.id === restoredBy)?.with?.key ?? key),
            };
          });
        expect(saved.length).toBeGreaterThan(0);
        expect(
          saved
            .filter(({ key }) => !lookups.some((lookup) => key.startsWith(lookup)))
            .map(({ job, key }) => `${job}: ${key}`),
        ).toStrictEqual([]);
      }),
    ));

  it("records a stuck pull-request check as a failure before the runner sits pending", () =>
    Effect.runPromise(
      Effect.gen(function* stuckCheckRecorded() {
        expect.hasAssertions();
        const workflow = yield* repositoryText(".github/workflows/check.yml");
        expect(workflow).toMatch(
          /^ {2}check-shard:\n {4}if: .+\n {4}runs-on: .+\n {4}timeout-minutes: 15$/mu,
        );
        expect(workflow).toMatch(
          /^ {2}check:\n {4}if: \$\{\{ always\(\) .+\n {4}needs: \[check-shard\]\n/mu,
        );
      }),
    ));
});
