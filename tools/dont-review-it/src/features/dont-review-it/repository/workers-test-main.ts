import { Effect, FileSystem, Path, Schema } from "effect";
import { parse } from "yaml";

const WorkspaceDefinition = Schema.Struct({ packages: Schema.Array(Schema.String) });

const OwnerManifest = Schema.fromJsonString(
  Schema.Struct({
    workersTest: Schema.optionalKey(
      Schema.Struct({
        defaultHandler: Schema.optionalKey(Schema.Boolean),
        entry: Schema.String,
      }),
    ),
  }),
);

class WorkersTestHandlerNotSingle extends Schema.TaggedError<WorkersTestHandlerNotSingle>()(
  "WorkersTestHandlerNotSingle",
  { entries: Schema.Array(Schema.String) },
) {
  override get message(): string {
    return `exactly one workspace package must declare workersTest.defaultHandler, found [${this.entries.join(", ")}]`;
  }
}

class UnlistableWorkspace extends Schema.TaggedError<UnlistableWorkspace>()("UnlistableWorkspace", {
  pattern: Schema.String,
}) {
  override get message(): string {
    return `pnpm-workspace.yaml lists ${this.pattern}, which is not a <directory>/* package pattern`;
  }
}

type OwnerEntry = Readonly<{ defaultHandler: boolean; entry: string }>;

const packageDirectories = Effect.fn("packageDirectories")(function* packageDirectories(
  root: string,
) {
  const filesystem = yield* FileSystem.FileSystem;
  const paths = yield* Path.Path;
  const definition = yield* filesystem.readFileString(paths.join(root, "pnpm-workspace.yaml"));
  const workspace = yield* Schema.decodeUnknownEffect(WorkspaceDefinition)(parse(definition));
  const listed = yield* Effect.forEach(workspace.packages, (pattern) =>
    Effect.gen(function* listed() {
      if (!pattern.endsWith("/*")) {
        return yield* new UnlistableWorkspace({ pattern });
      }
      const parent = paths.join(root, pattern.slice(0, -"/*".length));
      const children = yield* filesystem.readDirectory(parent);
      return children.map((child) => paths.join(parent, child));
    }),
  );
  return listed.flat();
});

const ownerEntryIn = Effect.fn("ownerEntryIn")(function* ownerEntryIn(directory: string) {
  const filesystem = yield* FileSystem.FileSystem;
  const paths = yield* Path.Path;
  const manifestPath = paths.join(directory, "package.json");
  if (!(yield* filesystem.exists(manifestPath))) {
    return [];
  }
  const manifest = yield* Schema.decodeEffect(OwnerManifest)(
    yield* filesystem.readFileString(manifestPath),
  );
  if (manifest.workersTest === undefined) {
    return [];
  }
  const ownerEntry: OwnerEntry = {
    defaultHandler: manifest.workersTest.defaultHandler === true,
    entry: paths.join(directory, manifest.workersTest.entry),
  };
  return [ownerEntry];
});

const workersTestMainSource = Effect.fn("workersTestMainSource")(function* workersTestMainSource(
  root: string,
) {
  const directories = yield* packageDirectories(root);
  const owners = (yield* Effect.forEach(directories, ownerEntryIn))
    .flat()
    .toSorted((left, right) => left.entry.localeCompare(right.entry));
  const handlers = owners.filter((owner) => owner.defaultHandler);
  const [handler] = handlers;
  if (handler === undefined || handlers.length > 1) {
    return yield* new WorkersTestHandlerNotSingle({
      entries: handlers.map((owner) => owner.entry),
    });
  }
  return [
    ...owners.map((owner) => `export * from ${JSON.stringify(owner.entry)};`),
    `export { default } from ${JSON.stringify(handler.entry)};`,
    "",
  ].join("\n");
});

export { workersTestMainSource };
