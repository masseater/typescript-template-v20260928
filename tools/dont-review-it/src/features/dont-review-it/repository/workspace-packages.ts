import { repositoryRoot } from "@repo/config/repository-root";
import { workspaceMembers } from "@repo/config/workspace-members";
import { Effect, Path } from "effect";
import { uniq } from "es-toolkit";
import { parseSync } from "oxc-parser";

import { packageNameOf } from "../lint/oxlint/lib/package-specifier.ts";
import { textOrNull } from "../platform/file-system.ts";

import type { WorkspacePackage } from "./pr-affected-scope.ts";

const TOOLCHAIN_CONFIG = "vite.config.ts";

const toolchainImportsIn = (source: string): readonly string[] =>
  parseSync(TOOLCHAIN_CONFIG, source).program.body.flatMap((statement) =>
    statement.type === "ImportDeclaration" && !statement.source.value.startsWith(".")
      ? (packageNameOf(statement.source.value) ?? [])
      : [],
  );

const workspacePackages = Effect.gen(function* workspacePackages() {
  const paths = yield* Path.Path;
  const members = yield* workspaceMembers(repositoryRoot);
  return yield* Effect.forEach(
    members.filter((member) => member.directory !== "."),
    (member) =>
      Effect.gen(function* workspacePackage() {
        const toolchainSource = yield* textOrNull(
          paths.join(repositoryRoot, member.directory, TOOLCHAIN_CONFIG),
        );
        const workspace: WorkspacePackage = {
          dependencies: uniq([
            ...member.workspaceDependencies,
            ...(toolchainSource === null ? [] : toolchainImportsIn(toolchainSource)),
          ]),
          directory: member.directory,
          name: member.packageName,
        };
        return workspace;
      }),
  );
});

export { workspacePackages };
