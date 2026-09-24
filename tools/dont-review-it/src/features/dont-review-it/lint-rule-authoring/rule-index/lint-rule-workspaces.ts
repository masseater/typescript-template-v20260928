import { Effect, type FileSystem, Schema } from "effect";
import { attempt, isPlainObject } from "es-toolkit";
import { parse } from "yaml";

import { textOrNull } from "../../platform/file-system.ts";
import { PackageManifest } from "../../platform/package-manifest.ts";
import { path } from "../../platform/path.ts";
import { directoriesMatching } from "../../platform/workspace-patterns.ts";

import type { TreeFailure } from "../../platform/directory-entries.ts";

export type LintRuleWorkspace = {
  readonly workspaceDir: string;
  readonly ruleDirectories: readonly string[];
};

class WorkspaceDefinitionUnparsable extends Schema.TaggedError<WorkspaceDefinitionUnparsable>()(
  "WorkspaceDefinitionUnparsable",
  { file: Schema.String, cause: Schema.Defect() },
) {
  override get message(): string {
    return `${this.file} exists but does not parse as YAML`;
  }
}

export type LintRuleWorkspaceFailure =
  | TreeFailure
  | WorkspaceDefinitionUnparsable
  | Schema.SchemaError;

const WORKSPACE_DEFINITION_FILE = "pnpm-workspace.yaml";

const WORKSPACE_PATTERNS_FIELD = "packages";

const declaredWorkspaceDirs = (
  repositoryRoot: string,
): Effect.Effect<readonly string[], LintRuleWorkspaceFailure, FileSystem.FileSystem> =>
  Effect.gen(function* declaredWorkspaceDirs() {
    const definitionText = yield* textOrNull(path.join(repositoryRoot, WORKSPACE_DEFINITION_FILE));
    if (definitionText === null) return [];

    const [unparsableDefinition, definition] = attempt((): unknown => parse(definitionText));
    if (unparsableDefinition !== null) {
      return yield* new WorkspaceDefinitionUnparsable({
        file: WORKSPACE_DEFINITION_FILE,
        cause: unparsableDefinition,
      });
    }
    if (!isPlainObject(definition)) return [];

    const patterns: unknown = definition[WORKSPACE_PATTERNS_FIELD];
    if (!Array.isArray(patterns)) return [];

    const expanded = yield* Effect.forEach(
      patterns.filter((pattern): pattern is string => typeof pattern === "string"),
      (pattern) => directoriesMatching({ repositoryRoot, pattern }),
    );
    return expanded.flat();
  });

const ruleDirectoriesDeclaredAt = ({
  repositoryRoot,
  workspaceDir,
}: {
  readonly repositoryRoot: string;
  readonly workspaceDir: string;
}): Effect.Effect<readonly string[], LintRuleWorkspaceFailure, FileSystem.FileSystem> =>
  Effect.gen(function* ruleDirectoriesDeclaredAt() {
    const manifestText = yield* textOrNull(path.join(repositoryRoot, workspaceDir, "package.json"));
    if (manifestText === null) return [];

    const manifest = yield* Schema.decodeEffect(Schema.fromJsonString(PackageManifest))(
      manifestText,
    );
    return manifest.lintRules ?? [];
  });

export const lintRuleWorkspacesIn = (
  repositoryRoot: string,
): Effect.Effect<readonly LintRuleWorkspace[], LintRuleWorkspaceFailure, FileSystem.FileSystem> =>
  Effect.gen(function* lintRuleWorkspacesIn() {
    const workspaceDirs = yield* declaredWorkspaceDirs(repositoryRoot);
    const workspaces = yield* Effect.forEach(workspaceDirs, (workspaceDir) =>
      ruleDirectoriesDeclaredAt({ repositoryRoot, workspaceDir }).pipe(
        Effect.map((ruleDirectories) => ({ workspaceDir, ruleDirectories })),
      ),
    );
    return workspaces
      .filter((workspace) => workspace.ruleDirectories.length > 0)
      .toSorted((left, right) => left.workspaceDir.localeCompare(right.workspaceDir));
  });
export type { WorkspaceDefinitionUnparsable };
