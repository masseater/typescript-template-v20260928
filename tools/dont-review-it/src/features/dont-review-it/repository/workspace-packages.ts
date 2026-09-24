import { repositoryRoot } from "@repo/config/repository-root";
import { Effect, FileSystem, Path, Schema } from "effect";
import { uniq } from "es-toolkit";
import { parseSync } from "oxc-parser";

import { packageNameOf } from "../lint/oxlint/lib/package-specifier.ts";
import { directoryEntries } from "../platform/directory-entries.ts";
import { textOrNull } from "../platform/file-system.ts";
import { packageDependencyFields, PackageManifest } from "../platform/package-manifest.ts";
import { workspaceRoots } from "./workspace-layout.ts";

import type { WorkspacePackage } from "./pr-affected-scope.ts";

const PackageManifestText = Schema.fromJsonString(PackageManifest);

class UnnamedWorkspace extends Schema.TaggedError<UnnamedWorkspace>()("UnnamedWorkspace", {
  directory: Schema.String,
}) {
  public override get message(): string {
    return `${this.directory} is missing a package name`;
  }
}

const dependencyNames = (manifest: PackageManifest): readonly string[] =>
  packageDependencyFields.flatMap((field) => {
    const declared = manifest[field];
    if (declared === undefined) {
      return [];
    }
    return Object.entries(declared).flatMap(([name, version]) =>
      version.startsWith("workspace:") ? [name] : [],
    );
  });

const TOOLCHAIN_CONFIG = "vite.config.ts";

const toolchainImportsIn = (source: string): readonly string[] =>
  parseSync(TOOLCHAIN_CONFIG, source).program.body.flatMap((statement) =>
    statement.type === "ImportDeclaration" && !statement.source.value.startsWith(".")
      ? (packageNameOf(statement.source.value) ?? [])
      : [],
  );

const workspacePackages = Effect.gen(function* workspacePackages() {
  const filesystem = yield* FileSystem.FileSystem;
  const paths = yield* Path.Path;
  const grouped = yield* Effect.forEach(workspaceRoots, (root) =>
    Effect.gen(function* workspacesUnder() {
      const entries = yield* directoryEntries(paths.join(repositoryRoot, root));
      const directories = entries.filter((entry) => entry.kind === "directory");
      return yield* Effect.forEach(directories, (entry) =>
        Effect.gen(function* workspacePackage() {
          const directory = `${root}/${entry.name}`;
          const manifest = yield* Schema.decodeEffect(PackageManifestText)(
            yield* filesystem.readFileString(
              paths.join(repositoryRoot, root, entry.name, "package.json"),
            ),
          );
          if (manifest.name === undefined) {
            return yield* new UnnamedWorkspace({ directory });
          }
          const toolchainSource = yield* textOrNull(
            paths.join(repositoryRoot, root, entry.name, TOOLCHAIN_CONFIG),
          );
          const workspace: WorkspacePackage = {
            dependencies: uniq([
              ...dependencyNames(manifest),
              ...(toolchainSource === null ? [] : toolchainImportsIn(toolchainSource)),
            ]),
            directory,
            name: manifest.name,
          };
          return workspace;
        }),
      );
    }),
  );
  return grouped.flat();
});

export { workspacePackages };
