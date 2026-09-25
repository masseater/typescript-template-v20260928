import { Effect, FileSystem, Path, Result, Schema } from "effect";
import { parse } from "yaml";

const OptionalDependencySpecifiers = Schema.optionalKey(
  Schema.Record(Schema.String, Schema.String),
);

const packageDependencyFields = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

type PackageDependencyField = (typeof packageDependencyFields)[number];

const dependencyFieldSchemas = {
  dependencies: OptionalDependencySpecifiers,
  devDependencies: OptionalDependencySpecifiers,
  optionalDependencies: OptionalDependencySpecifiers,
  peerDependencies: OptionalDependencySpecifiers,
} as const satisfies Record<PackageDependencyField, Schema.Top>;

const WorkspaceDefinition = Schema.Struct({ packages: Schema.Array(Schema.String) });

const MemberManifest = Schema.fromJsonString(
  Schema.Struct({ name: Schema.String, ...dependencyFieldSchemas }),
);

type WorkspaceMember = Readonly<{
  directory: string;
  packageName: string;
  workspaceDependencies: readonly string[];
}>;

class UnlistableWorkspace extends Schema.TaggedError<UnlistableWorkspace>()("UnlistableWorkspace", {
  definition: Schema.String,
  reason: Schema.String,
}) {
  override get message(): string {
    return `${this.definition} does not list the workspace packages: ${this.reason}`;
  }
}

const WORKSPACE_DEFINITION = "pnpm-workspace.yaml";

const decodeDefinition = Schema.decodeUnknownResult(WorkspaceDefinition);

const packageParentOf = (
  definition: string,
  pattern: string,
): Result.Result<string, UnlistableWorkspace> => {
  const parent = pattern.slice(0, -"/*".length);
  return !pattern.endsWith("/*") || parent === "" || /[*?[\]{}!]/u.test(parent)
    ? Result.fail(
        new UnlistableWorkspace({
          definition,
          reason: `${pattern} is not a <directory>/* package pattern`,
        }),
      )
    : Result.succeed(parent);
};

const packageParentsIn = ({
  definition,
  definitionYaml,
}: Readonly<{ definition: string; definitionYaml: string }>): Result.Result<
  readonly string[],
  UnlistableWorkspace
> =>
  Result.try({
    catch: () => new UnlistableWorkspace({ definition, reason: "it is not YAML" }),
    try: (): unknown => parse(definitionYaml),
  }).pipe(
    Result.flatMap((definitionDocument) =>
      Result.mapError(
        decodeDefinition(definitionDocument),
        () =>
          new UnlistableWorkspace({ definition, reason: "it does not list packages as strings" }),
      ),
    ),
    Result.flatMap((decoded) =>
      Result.all(decoded.packages.map((pattern) => packageParentOf(definition, pattern))),
    ),
  );

const listedPackageParents = (
  listed: Readonly<{ definition: string; definitionYaml: string }>,
): readonly string[] => Result.getOrThrow(packageParentsIn(listed));

const workspacePackageParents = Effect.fn("workspacePackageParents")(
  function* workspacePackageParents(root: string) {
    const filesystem = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const definition = paths.join(root, WORKSPACE_DEFINITION);
    const definitionYaml = yield* filesystem.readFileString(definition);
    return yield* Effect.fromResult(packageParentsIn({ definition, definitionYaml }));
  },
);

const workspaceDependenciesOf = (
  manifest: Readonly<Partial<Record<PackageDependencyField, Readonly<Record<string, string>>>>>,
): readonly string[] =>
  packageDependencyFields.flatMap((field) =>
    Object.entries(manifest[field] ?? {}).flatMap(([dependencyName, versionRange]) =>
      versionRange.startsWith("workspace:") ? [dependencyName] : [],
    ),
  );

const holdsManifest = Effect.fn("holdsManifest")(function* holdsManifest(
  root: string,
  directory: string,
) {
  const filesystem = yield* FileSystem.FileSystem;
  const paths = yield* Path.Path;
  const directoryStat = yield* filesystem.stat(paths.join(root, directory));
  return (
    directoryStat.type === "Directory" &&
    (yield* filesystem.exists(paths.join(root, directory, "package.json")))
  );
});

const packageDirectoriesUnder = Effect.fn("packageDirectoriesUnder")(
  function* packageDirectoriesUnder(root: string, parent: string) {
    const filesystem = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const childNames = yield* filesystem.readDirectory(paths.join(root, parent));
    const candidates = childNames.map((childName) => `${parent}/${childName}`);
    const manifests = yield* Effect.forEach(candidates, (directory) =>
      holdsManifest(root, directory),
    );
    return candidates.filter((_directory, index) => manifests[index] === true);
  },
);

const workspaceMemberAt = Effect.fn("workspaceMemberAt")(function* workspaceMemberAt(
  root: string,
  directory: string,
) {
  const filesystem = yield* FileSystem.FileSystem;
  const paths = yield* Path.Path;
  const manifest = yield* Schema.decodeEffect(MemberManifest)(
    yield* filesystem.readFileString(paths.join(root, directory, "package.json")),
  );
  const member: WorkspaceMember = {
    directory,
    packageName: manifest.name,
    workspaceDependencies: workspaceDependenciesOf(manifest),
  };
  return member;
});

const workspaceMembers = Effect.fn("workspaceMembers")(function* workspaceMembers(root: string) {
  const parents = yield* workspacePackageParents(root);
  const directories = yield* Effect.forEach(parents, (parent) =>
    packageDirectoriesUnder(root, parent),
  );
  return yield* Effect.forEach([".", ...directories.flat().toSorted()], (directory) =>
    workspaceMemberAt(root, directory),
  );
});

export {
  dependencyFieldSchemas,
  listedPackageParents,
  packageDependencyFields,
  UnlistableWorkspace,
  WORKSPACE_DEFINITION,
  workspaceMembers,
  workspacePackageParents,
};
export type { PackageDependencyField, WorkspaceMember };
