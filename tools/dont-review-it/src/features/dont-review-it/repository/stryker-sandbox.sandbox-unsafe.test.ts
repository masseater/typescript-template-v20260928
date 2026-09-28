import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, Path } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { filePathOf, path } from "../platform/path.ts";
import { repositoryRoot } from "./repository-root.ts";
import { sandboxUnsafeReasons, sandboxUnsafeTestFiles } from "./stryker-sandbox-test-fixture.ts";
import configuration from "./stryker.config.ts";
import { sandboxUnsafeTestSuffix, sandboxUnsafeTests } from "./test-runtime.ts";

const qualityDirectory = filePathOf(new URL(".", import.meta.url));

const REPOSITORY_DIRECTORY = "tools/dont-review-it/src/features/dont-review-it/repository";

const qualityFiles = Effect.gen(function* qualityFiles() {
  const filesystem = yield* FileSystem.FileSystem;
  return yield* filesystem.readDirectory(qualityDirectory);
});

const onDiskSandboxUnsafe = Effect.map(qualityFiles, (files) =>
  files
    .filter((file) => file.endsWith(sandboxUnsafeTestSuffix))
    .map((file) => `${REPOSITORY_DIRECTORY}/${file}`)
    .toSorted(),
);

const needsRepositoryLayout = (source: string): boolean =>
  sandboxUnsafeReasons.some((reason) => source.includes(reason));

const unmarkedSandboxUnsafe = Effect.gen(function* unmarkedSandboxUnsafe() {
  const filesystem = yield* FileSystem.FileSystem;
  const paths = yield* Path.Path;
  const candidates = (yield* qualityFiles).filter(
    (file) => file.endsWith(".test.ts") && !file.endsWith(sandboxUnsafeTestSuffix),
  );
  const unmarked = yield* Effect.filter(candidates, (file) =>
    Effect.map(
      filesystem.readFileString(paths.join(qualityDirectory, file)),
      needsRepositoryLayout,
    ),
  );
  return unmarked.map((file) => `${REPOSITORY_DIRECTORY}/${file}`).toSorted();
});

const trackedSources: readonly string[] = Object.keys(
  import.meta.glob([
    "../../../../../../**/*.{ts,tsx,mts}",
    "!**/.*/**",
    "!**/dist/**",
    "!**/node_modules/**",
  ]),
).map((key) => path.relative(repositoryRoot, filePathOf(new URL(key, import.meta.url))));

const OWNER = "tools/dont-review-it/src/features/dont-review-it/repository/test-runtime.ts";

const QUOTE = "[\"'`]";

const spelledNames = [sandboxUnsafeTestSuffix, sandboxUnsafeTests].map(
  (name) => new RegExp(`${QUOTE}${name.replaceAll(/[.*]/gu, String.raw`\$&`)}${QUOTE}`, "u"),
);

const spellsSandboxUnsafeName = (source: string): boolean =>
  spelledNames.some((spelled) => spelled.test(source));

const sourcesSpellingTheName = Effect.gen(function* sourcesSpellingTheName() {
  const filesystem = yield* FileSystem.FileSystem;
  const spelling = yield* Effect.filter(
    trackedSources.filter((file) => file !== OWNER),
    (file) =>
      Effect.map(
        filesystem.readFileString(path.join(repositoryRoot, file)),
        spellsSandboxUnsafeName,
      ),
  );
  return spelling.toSorted();
});

describe("stryker sandbox unsafe tests", () => {
  it("derives ignorePatterns from the sandbox-unsafe test name", () => {
    expect.hasAssertions();
    expect(configuration.ignorePatterns).toContain(sandboxUnsafeTests);
  });

  it("spells the sandbox-unsafe suffix and glob only where test-runtime.ts declares them", () =>
    Effect.runPromise(
      Effect.gen(function* sandboxUnsafeNameOwned() {
        expect.hasAssertions();
        expect(yield* sourcesSpellingTheName).toStrictEqual([]);
      }).pipe(Effect.provide(NodeServices.layer)),
    ));

  it.for([
    `const pattern = "${sandboxUnsafeTests}";`,
    `file.endsWith('${sandboxUnsafeTestSuffix}')`,
    `ignorePatterns: [\`${sandboxUnsafeTests}\`]`,
  ])("reports a source that spells the name again: %s", (source) => {
    expect(spellsSandboxUnsafeName(source)).toBe(true);
  });

  it("leaves a path that only ends in the suffix alone", () => {
    expect(spellsSandboxUnsafeName(`"repository/stryker-sandbox${sandboxUnsafeTestSuffix}"`)).toBe(
      false,
    );
  });

  it("lists every sandbox-unsafe test beside the pattern", () =>
    Effect.runPromise(
      Effect.gen(function* sandboxUnsafeListed() {
        expect.hasAssertions();
        expect(yield* onDiskSandboxUnsafe).toStrictEqual([...sandboxUnsafeTestFiles].toSorted());
      }).pipe(Effect.provide(NodeServices.layer)),
    ));

  it.for([
    "yield* filesystem.readLink(entry)",
    "yield* filesystem.symlink(target, link)",
    'info.type === "SymbolicLink"',
    "readlinkSync(entry)",
    "symlinkSync(target, link)",
    "lstatSync(entry).isSymbolicLink()",
    'paths.join(root, "tsconfig.json")',
    'ChildProcess.make(vp, ["pack", "--out-dir", packed])',
  ])("treats a test calling %s as needing the real repository layout", (source) => {
    expect(needsRepositoryLayout(source)).toBe(true);
  });

  it("leaves a test that only reads file contents in the sandbox", () => {
    expect(needsRepositoryLayout("yield* filesystem.readFileString(file)")).toBe(false);
  });

  it("marks every test that needs the real repository layout", () =>
    Effect.runPromise(
      Effect.gen(function* sandboxUnsafeMarked() {
        expect.hasAssertions();
        expect(yield* unmarkedSandboxUnsafe).toStrictEqual([]);
      }).pipe(Effect.provide(NodeServices.layer)),
    ));
});
