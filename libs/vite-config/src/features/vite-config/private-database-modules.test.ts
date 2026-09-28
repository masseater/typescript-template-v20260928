import { repositoryRoot } from "@repo/config/repository-root";
import { Effect, Schema } from "effect";
import { parseSync } from "oxc-parser";
import { describe, expect, test } from "vite-plus/test";

import { filesystem, paths } from "./host.ts";
import { databaseSourceDirectory, privateDatabaseModules } from "./private-database-modules.ts";

const DatabaseManifest = Schema.Struct({
  exports: Schema.Record(Schema.String, Schema.String),
});

const databaseRoot = paths.join(repositoryRoot, "libs", "db");

const relativeSpecifiers = (file: string, source: string): readonly string[] => {
  const parsed = parseSync(file, source);
  return [
    ...parsed.module.staticImports.map((declaration) => declaration.moduleRequest.value),
    ...parsed.module.staticExports.flatMap((declaration) =>
      declaration.entries.flatMap((entry) =>
        entry.moduleRequest === null ? [] : [entry.moduleRequest.value],
      ),
    ),
  ].filter((specifier) => specifier.startsWith("."));
};

const importClosure = (entry: string): Effect.Effect<ReadonlySet<string>, unknown> =>
  Effect.gen(function* collectClosure() {
    const reached = new Set<string>();
    const pending = [paths.resolve(databaseRoot, entry)];
    while (pending.length > 0) {
      const file = pending.pop() ?? "";
      if (!reached.has(file)) {
        reached.add(file);
        const source = yield* filesystem.readFileString(file);
        pending.push(
          ...relativeSpecifiers(file, source).map((specifier) =>
            paths.resolve(paths.dirname(file), specifier),
          ),
        );
      }
    }
    return reached;
  });

const derivedPrivateFiles = Effect.gen(function* derivePrivateFiles() {
  const manifest = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(DatabaseManifest))(
    yield* filesystem.readFileString(paths.join(databaseRoot, "package.json")),
  );
  const privateSubpaths = new Set(privateDatabaseModules.map((module) => module.subpath));
  const publicClosures = yield* Effect.forEach(
    Object.entries(manifest.exports).filter(([subpath]) => !privateSubpaths.has(subpath)),
    ([, entry]) => importClosure(entry),
  );
  const publicFiles = new Set(publicClosures.flatMap((closure) => [...closure]));
  return yield* Effect.forEach(privateDatabaseModules, (module) => {
    const entry = manifest.exports[module.subpath];
    return entry === undefined
      ? Effect.succeed({ files: [], subpath: module.subpath })
      : Effect.map(importClosure(entry), (closure) => ({
          files: [...closure]
            .filter((file) => !publicFiles.has(file))
            .map((file) =>
              paths.relative(paths.join(repositoryRoot, databaseSourceDirectory), file),
            )
            .sort(),
          subpath: module.subpath,
        }));
  });
});

describe("private database modules", () => {
  const it = test.extend("derivedModules", () => Effect.runPromise(derivedPrivateFiles));

  it("lists for each private subpath exactly the files only that subpath reaches", ({
    derivedModules,
  }) => {
    expect(derivedModules).toStrictEqual(
      privateDatabaseModules.map((module) => ({
        files: [...module.files].sort(),
        subpath: module.subpath,
      })),
    );
  });
});
