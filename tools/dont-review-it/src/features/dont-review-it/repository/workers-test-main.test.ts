import { NodeServices } from "@effect/platform-node";
import { Effect, Exit, FileSystem, Path } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { path } from "../platform/path.ts";
import { repositoryRoot } from "./repository-root.ts";
import { workersTestMainSource } from "./workers-test-main.ts";

type Manifest = Readonly<Record<string, unknown>>;

const composedIn = (manifests: Readonly<Record<string, Manifest>>) =>
  Effect.gen(function* composedIn() {
    const filesystem = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const root = yield* filesystem.makeTempDirectoryScoped();
    yield* filesystem.writeFileString(
      paths.join(root, "pnpm-workspace.yaml"),
      "packages:\n  - apps/*\n  - libs/*\n",
    );
    yield* filesystem.makeDirectory(paths.join(root, "apps"), { recursive: true });
    yield* filesystem.makeDirectory(paths.join(root, "libs"), { recursive: true });
    yield* Effect.forEach(Object.entries(manifests), ([directory, manifest]) =>
      Effect.andThen(
        filesystem.makeDirectory(paths.join(root, directory), { recursive: true }),
        filesystem.writeFileString(
          paths.join(root, directory, "package.json"),
          JSON.stringify(manifest),
        ),
      ),
    );
    const composed = yield* Effect.exit(workersTestMainSource(root));
    return { composed, root };
  }).pipe(Effect.scoped, Effect.provide(NodeServices.layer), Effect.runPromise);

describe("workersTestMainSource", () => {
  it("re-exports every declared owner entry and takes the default handler from the one owner that serves it", async () => {
    const { composed, root } = await composedIn({
      "apps/api": { name: "@x/api", workersTest: { entry: "./src/api.ts" } },
      "apps/plain": { name: "@x/plain" },
      "libs/probe": {
        name: "@x/probe",
        workersTest: { defaultHandler: true, entry: "./src/probe-test-fixture.ts" },
      },
    });

    expect(composed).toStrictEqual(
      Exit.succeed(
        [
          `export * from ${JSON.stringify(path.join(root, "apps/api/src/api.ts"))};`,
          `export * from ${JSON.stringify(path.join(root, "libs/probe/src/probe-test-fixture.ts"))};`,
          `export { default } from ${JSON.stringify(path.join(root, "libs/probe/src/probe-test-fixture.ts"))};`,
          "",
        ].join("\n"),
      ),
    );
  });

  it("refuses a workspace where no owner serves the default handler", async () => {
    const { composed } = await composedIn({
      "apps/api": { name: "@x/api", workersTest: { entry: "./src/api.ts" } },
    });

    expect(Exit.isFailure(composed)).toBe(true);
  });

  it("refuses a workspace where two owners serve the default handler", async () => {
    const { composed } = await composedIn({
      "apps/api": { name: "@x/api", workersTest: { defaultHandler: true, entry: "./src/api.ts" } },
      "libs/probe": {
        name: "@x/probe",
        workersTest: { defaultHandler: true, entry: "./src/probe-test-fixture.ts" },
      },
    });

    expect(Exit.isFailure(composed)).toBe(true);
  });

  it("composes the entries this repository's owners declare", async () => {
    const source = await workersTestMainSource(repositoryRoot).pipe(
      Effect.provide(NodeServices.layer),
      Effect.runPromise,
    );

    expect(source.split("\n")).toStrictEqual([
      `export * from ${JSON.stringify(path.join(repositoryRoot, "apps/core/src/features/core/internal-api.ts"))};`,
      `export * from ${JSON.stringify(path.join(repositoryRoot, "apps/service-member/src/shared/inbox/inbox.ts"))};`,
      `export * from ${JSON.stringify(path.join(repositoryRoot, "libs/monitor/src/features/monitor/monitor-test-fixture.ts"))};`,
      `export { default } from ${JSON.stringify(path.join(repositoryRoot, "libs/monitor/src/features/monitor/monitor-test-fixture.ts"))};`,
      "",
    ]);
  });
});
