import { NodeServices } from "@effect/platform-node";
import { layer } from "@effect/vitest";
import { Effect, FileSystem, Path } from "effect";
import { describe, expect } from "vite-plus/test";

import { readTextFile } from "../canonical-values/source-files.ts";
import { buildRepositoryCellClassIndex, loadRepositoryCellClassIndex } from "./builder.ts";

const TALLY = `class Tally {
  total = 0;
  add(row: number) {
    this.total += row;
  }
}

const sum = (rows: readonly number[]): number => {
  const tally = new Tally();
  for (const row of rows) tally.add(row);
  return tally.total;
};

export const total = sum([1, 2]);
`;

layer(NodeServices.layer)("loadRepositoryCellClassIndex", (it) => {
  describe("a source holding a class standing in for a local variable", () => {
    const fixture = Effect.gen(function* cellClassIndex() {
      const filesystem = yield* FileSystem.FileSystem;
      const paths = yield* Path.Path;
      const root = yield* filesystem.makeTempDirectoryScoped({
        prefix: "mutable-cell-classes-builder-",
      });

      yield* filesystem.makeDirectory(paths.join(root, "src"), { recursive: true });
      yield* filesystem.writeFileString(paths.join(root, "src", "a.ts"), TALLY);
      return loadRepositoryCellClassIndex({ repositoryRoot: root });
    });

    it.effect("is found at its own path", () =>
      Effect.gen(function* program() {
        const cellClassIndex = yield* fixture;
        expect(cellClassIndex).toStrictEqual({
          findingsByPath: new Map([
            ["src/a.ts", [{ className: "Tally", fields: ["total"], scopeName: "sum" }]],
          ]),
        });
      }),
    );
  });

  describe("a repository whose sources are all out of scope", () => {
    const fixture = Effect.gen(function* cellClassIndex() {
      const filesystem = yield* FileSystem.FileSystem;
      const paths = yield* Path.Path;
      const root = yield* filesystem.makeTempDirectoryScoped({
        prefix: "mutable-cell-classes-builder-",
      });

      yield* filesystem.makeDirectory(paths.join(root, "src"), { recursive: true });
      yield* filesystem.writeFileString(paths.join(root, "src", "a.test.ts"), TALLY);
      return loadRepositoryCellClassIndex({ repositoryRoot: root });
    });

    it.effect("is indexed as empty", () =>
      Effect.gen(function* program() {
        const cellClassIndex = yield* fixture;
        expect(cellClassIndex).toStrictEqual({ findingsByPath: new Map() });
      }),
    );
  });

  describe("a repository holding no source at all", () => {
    const fixture = Effect.gen(function* cellClassIndex() {
      const filesystem = yield* FileSystem.FileSystem;
      const paths = yield* Path.Path;
      const root = yield* filesystem.makeTempDirectoryScoped({
        prefix: "mutable-cell-classes-builder-",
      });

      yield* filesystem.writeFileString(paths.join(root, "notes.md"), "nothing to read\n");
      return loadRepositoryCellClassIndex({ repositoryRoot: root });
    });

    it.effect("is indexed as empty", () =>
      Effect.gen(function* program() {
        const cellClassIndex = yield* fixture;
        expect(cellClassIndex).toStrictEqual({ findingsByPath: new Map() });
      }),
    );
  });

  describe("a source that vanished after the listing", () => {
    const fixture = Effect.gen(function* cellClassIndex() {
      const filesystem = yield* FileSystem.FileSystem;
      const paths = yield* Path.Path;
      const root = yield* filesystem.makeTempDirectoryScoped({
        prefix: "mutable-cell-classes-builder-",
      });

      yield* filesystem.makeDirectory(paths.join(root, "src"), { recursive: true });
      yield* filesystem.writeFileString(paths.join(root, "src", "vanished.ts"), TALLY);
      return buildRepositoryCellClassIndex({
        repositoryRoot: root,
        readText: (path) => (path.endsWith("vanished.ts") ? null : readTextFile(path)),
      });
    });

    it.effect("is left out of the index", () =>
      Effect.gen(function* program() {
        const cellClassIndex = yield* fixture;
        expect(cellClassIndex).toStrictEqual({ findingsByPath: new Map() });
      }),
    );
  });

  describe("the index of a repository", () => {
    const fixture = Effect.gen(function* sameIndexOnASecondAsk() {
      const filesystem = yield* FileSystem.FileSystem;
      const paths = yield* Path.Path;
      const root = yield* filesystem.makeTempDirectoryScoped({
        prefix: "mutable-cell-classes-builder-",
      });

      yield* filesystem.makeDirectory(paths.join(root, "src"), { recursive: true });
      yield* filesystem.writeFileString(paths.join(root, "src", "a.ts"), TALLY);
      return (
        loadRepositoryCellClassIndex({ repositoryRoot: root }) ===
        loadRepositoryCellClassIndex({ repositoryRoot: root })
      );
    });

    it.effect("is built once and handed back on every later ask", () =>
      Effect.gen(function* program() {
        const sameIndexOnASecondAsk = yield* fixture;
        expect(sameIndexOnASecondAsk).toBe(true);
      }),
    );
  });
});
