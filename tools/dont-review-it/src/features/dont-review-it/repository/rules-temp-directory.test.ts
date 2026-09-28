import { describe, expect, it } from "vite-plus/test";

import { reported } from "./lint-harness-test-fixture.ts";

const fixtureFile =
  "tools/dont-review-it/src/features/dont-review-it/repository/probe-test-fixture.ts";
const testFile = "tools/dont-review-it/src/features/dont-review-it/repository/probe.test.ts";
const productionFile = "tools/dont-review-it/src/features/dont-review-it/repository/probe.ts";

const fixedRoots = [
  [
    "join",
    'import { mkdirSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path"; mkdirSync(join(tmpdir(), "fixed-root"));',
  ],
  [
    "realpath",
    'import { rmSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path"; import { realpathSync } from "node:fs"; rmSync(join(realpathSync(tmpdir()), "fixed-root"), { recursive: true });',
  ],
  ["direct", 'import { tmpdir } from "node:os"; export const root = tmpdir();'],
] as const;

const uniqueRoots = [
  [
    "mkdtemp-sync",
    'import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path"; import { rm } from "node:fs/promises"; import { test } from "vite-plus/test"; const it = test.extend("root", async ({}, { onCleanup }) => { const root = mkdtempSync(join(tmpdir(), "probe-")); onCleanup(() => rm(root, { recursive: true })); return root; });',
  ],
  [
    "mkdtemp-async",
    'import { mkdtemp } from "node:fs/promises"; import { tmpdir } from "node:os"; import { join } from "node:path"; import { rm } from "node:fs/promises"; import { test } from "vite-plus/test"; const it = test.extend("root", async ({}, { onCleanup }) => { const root = await mkdtemp(join(tmpdir(), "probe-")); onCleanup(() => rm(root, { recursive: true })); return root; });',
  ],
  [
    "mkdtemp-realpath",
    'import { mkdtempSync, realpathSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path"; import { rm } from "node:fs/promises"; import { test } from "vite-plus/test"; const it = test.extend("root", async ({}, { onCleanup }) => { const root = mkdtempSync(join(realpathSync(tmpdir()), "probe-")); onCleanup(() => rm(root, { recursive: true })); return root; });',
  ],
  [
    "mkdtemp-tmpdir-only",
    'import { mkdtemp } from "node:fs/promises"; import { tmpdir } from "node:os"; import { rm } from "node:fs/promises"; import { test } from "vite-plus/test"; const it = test.extend("root", async ({}, { onCleanup }) => { const root = await mkdtemp(tmpdir()); onCleanup(() => rm(root, { recursive: true })); return root; });',
  ],
] as const;

const unremovedDirectories = [
  [
    "binding-never-handed-to-cleanup",
    'import { test } from "vite-plus/test"; const root = await Effect.runPromise(filesystem.makeTempDirectory({ prefix: "probe-" })); const it = test.extend("removal", { auto: true, scope: "file" }, ({}, { onCleanup }) => { onCleanup(() => undefined); return root; });',
  ],
  [
    "module-level",
    'import { Effect, FileSystem } from "effect"; const root = await Effect.runPromise(Effect.flatMap(FileSystem.FileSystem, (filesystem) => filesystem.makeTempDirectory({ prefix: "probe-" })));',
  ],
  [
    "fixture-without-cleanup",
    'import { test } from "vite-plus/test"; const it = test.extend("root", () => Effect.runPromise(filesystem.makeTempDirectory({ prefix: "probe-" })));',
  ],
  [
    "cleanup-in-a-sibling-fixture",
    'import { describe, test } from "vite-plus/test"; describe("probe", () => { const it = test.extend("first", ({}, { onCleanup }) => { onCleanup(() => undefined); return 1; }).extend("root", () => Effect.runPromise(filesystem.makeTempDirectory({ prefix: "probe-" }))); });',
  ],
  [
    "mkdtemp-sync",
    'import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path"; const root = mkdtempSync(join(tmpdir(), "probe-"));',
  ],
] as const;

const removedDirectories = [
  [
    "binding-removed-by-a-file-fixture",
    'import { test } from "vite-plus/test"; const root = await Effect.runPromise(filesystem.makeTempDirectory({ prefix: "probe-" })); const it = test.extend("removal", { auto: true, scope: "file" }, ({}, { onCleanup }) => { onCleanup(() => Effect.runPromise(removePath(root))); });',
  ],
  [
    "acquire-release",
    'import { Effect } from "effect"; const home = Effect.acquireRelease(Effect.gen(function* () { return yield* filesystem.makeTempDirectory({ prefix: "probe-" }); }), (made) => filesystem.remove(made));',
  ],
  [
    "scoped",
    'import { test } from "vite-plus/test"; const it = test.extend("root", () => Effect.runPromise(Effect.scoped(filesystem.makeTempDirectoryScoped({ prefix: "probe-" }))));',
  ],
  [
    "fixture-with-cleanup",
    'import { test } from "vite-plus/test"; const it = test.extend("root", ({}, { onCleanup }) => { const made = Effect.runPromise(filesystem.makeTempDirectory({ prefix: "probe-" })); onCleanup(() => made.then(remove)); return made; });',
  ],
] as const;

describe("temporary directories in tests and fixtures", () => {
  it.for(unremovedDirectories)(
    "rejects a temporary directory nothing removes: %s",
    ([_label, code]) => {
      expect.hasAssertions();
      expect(reported("temp-directory", { code, filename: testFile })).toBe(true);
      expect(reported("temp-directory", { code, filename: fixtureFile })).toBe(true);
    },
  );

  it.for(removedDirectories)(
    "allows a temporary directory its fixture removes: %s",
    ([_label, code]) => {
      expect.assertions(1);
      expect(reported("temp-directory", { code, filename: testFile })).toBe(false);
    },
  );

  it.for(fixedRoots)("rejects a fixed temporary path: %s", ([_label, code]) => {
    expect.hasAssertions();
    expect(reported("temp-directory", { code, filename: testFile })).toBe(true);
    expect(reported("temp-directory", { code, filename: fixtureFile })).toBe(true);
  });

  it.for(uniqueRoots)("allows mkdtemp around tmpdir: %s", ([_label, code]) => {
    expect.assertions(1);
    expect(reported("temp-directory", { code, filename: testFile })).toBe(false);
  });

  it("leaves production code alone", () => {
    expect.assertions(1);
    const code =
      'import { mkdirSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path"; mkdirSync(join(tmpdir(), "fixed-root"));';
    expect(reported("temp-directory", { code, filename: productionFile })).toBe(false);
  });
});
