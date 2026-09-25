#!/usr/bin/env node
import { env as processEnvironment } from "node:process";

import { reportFailed, runCli } from "@repo/cli";
import {
  applicationReadyPaths,
  applications,
  loopbackAddress,
  waitUntilResponds,
} from "@repo/config";
import { localDatabaseVariable } from "@repo/config/local-database-path";
import { migrateLocalDatabase } from "@repo/db-local/platform";
import { Cause, Console, Effect, FileSystem, Result, Schema } from "effect";
import { createServer } from "vite-plus";

import { describeError } from "./failure.ts";
import { layer } from "./platform.ts";
import { descendantPids, killQuietly, readProcessTable } from "./process-tree.ts";

import type { ChildProcessSpawner } from "effect/unstable/process";

class DevStartFailure extends Schema.TaggedError<DevStartFailure>()("DevStartFailure", {
  reason: Schema.String,
  cause: Schema.optional(Schema.Defect()),
}) {}

const Application = Schema.Literals(applications);
const successStatus = 200;
const requestTimeoutMilliseconds = 120_000;
const startTimeout = "5 minutes";
const closeTimeoutMilliseconds = 30_000;
const databasePrefix = "template-check-dev-";

function workspaceName(): string {
  const cwd = process.cwd();
  const separator = cwd.lastIndexOf("/");
  return separator === -1 ? cwd : cwd.slice(separator + 1);
}

const isolatedDatabase = Effect.acquireRelease(
  Effect.gen(function* prepareDatabase() {
    const fs = yield* FileSystem.FileSystem;
    const directory = yield* fs.makeTempDirectory({ prefix: databasePrefix }).pipe(
      Effect.mapError(
        (error) =>
          new DevStartFailure({
            reason: `failed to prepare database: ${describeError(error)}`,
          }),
      ),
    );
    processEnvironment[localDatabaseVariable] = directory;
    yield* migrateLocalDatabase.pipe(
      Effect.mapError(
        (error) =>
          new DevStartFailure({
            cause: error,
            reason: `failed to prepare database: ${error._tag === "RemoteFailure" ? error.code : describeError(error)}`,
          }),
      ),
    );
    return directory;
  }),
  (directory) =>
    Effect.gen(function* cleanupDatabase() {
      delete processEnvironment[localDatabaseVariable];
      const fs = yield* FileSystem.FileSystem;
      yield* fs.remove(directory, { force: true, recursive: true }).pipe(Effect.ignore);
    }),
);

const devServer = Effect.acquireRelease(
  Effect.tryPromise({
    catch: (error) => new DevStartFailure({ reason: `failed to start: ${describeError(error)}` }),
    try: () =>
      createServer({
        logLevel: "silent",
        server: { host: loopbackAddress, port: 0, strictPort: false },
      }),
  }),
  (server) =>
    stopDescendants.pipe(
      Effect.orDie,
      Effect.andThen(
        Effect.race(
          Effect.promise(() =>
            server.close().then(
              () => undefined,
              () => undefined,
            ),
          ),
          Effect.sleep(closeTimeoutMilliseconds),
        ),
      ),
    ),
);

const listeningOrigin = isolatedDatabase.pipe(
  Effect.flatMap(() => devServer),
  Effect.flatMap((server) =>
    Effect.tryPromise({
      catch: (error) =>
        new DevStartFailure({ reason: `failed to listen: ${describeError(error)}` }),
      try: () => server.listen(),
    }),
  ),
  Effect.flatMap((server) => {
    const [origin] = server.resolvedUrls?.local ?? [];
    return origin === undefined
      ? Effect.fail(new DevStartFailure({ reason: "did not listen" }))
      : Effect.succeed(origin);
  }),
);

function probe(origin: string, pathname: string): Effect.Effect<number, DevStartFailure> {
  return waitUntilResponds({
    accept: (status) => status === successStatus,
    method: "GET",
    onStatus: (status) => new DevStartFailure({ reason: `${pathname} responded ${status}` }),
    onUnreachable: (error) =>
      new DevStartFailure({ reason: `${pathname} did not answer: ${describeError(error)}` }),
    timeoutMilliseconds: requestTimeoutMilliseconds,
    url: new URL(pathname, origin).href,
  });
}

const stopDescendants: Effect.Effect<
  void,
  DevStartFailure,
  ChildProcessSpawner.ChildProcessSpawner
> = readProcessTable().pipe(
  Effect.mapError(
    (unreadable) =>
      new DevStartFailure({ reason: `failed to list processes: ${unreadable.reason}` }),
  ),
  Effect.map((rows) => {
    for (const pid of descendantPids(process.pid, rows)) {
      killQuietly(pid);
    }
  }),
);

const leave = stopDescendants.pipe(
  Effect.catchTag("DevStartFailure", (failure) => reportFailed(startFailed(failure))),
  Effect.andThen(
    Effect.sync(() => {
      process.exit(process.exitCode ?? 0);
    }),
  ),
);

function failed(app: string, ...reasons: readonly string[]): Readonly<Record<string, unknown>> {
  return { app, event: "quality.dev_start", ok: false, reasons };
}

function startFailed(failure: DevStartFailure): Readonly<Record<string, unknown>> {
  return failure.cause === undefined
    ? failed(workspaceName(), failure.reason)
    : { ...failed(workspaceName(), failure.reason), cause: Cause.pretty(Cause.die(failure.cause)) };
}

function report(app: string, reasons: readonly string[]): Effect.Effect<void> {
  return reasons.length === 0
    ? Console.log(JSON.stringify({ app, event: "quality.dev_start", ok: true }))
    : reportFailed(failed(app, ...reasons));
}

const program = Effect.gen(function* program() {
  const app = yield* Schema.decodeUnknownEffect(Application)(workspaceName()).pipe(
    Effect.mapError(() => new DevStartFailure({ reason: "not an application workspace" })),
  );
  const origin = yield* listeningOrigin;
  const paths = [...new Set(["/api/health", applicationReadyPaths[app]])];
  const results = yield* Effect.all(
    paths.map((pathname) => probe(origin, pathname)),
    { concurrency: "unbounded", mode: "result" },
  );
  const reasons = results.flatMap((result) =>
    Result.isFailure(result) ? [result.failure.reason] : [],
  );
  yield* report(workspaceName(), reasons);
}).pipe(
  Effect.scoped,
  Effect.timeoutOrElse({
    duration: startTimeout,
    orElse: () =>
      Effect.fail(new DevStartFailure({ reason: `did not finish within ${startTimeout}` })),
  }),
);

runCli(
  program.pipe(
    Effect.catchTag("DevStartFailure", (failure) => reportFailed(startFailed(failure))),
    Effect.andThen(() => leave),
    Effect.provide(layer),
  ),
  (cause) => failed(workspaceName(), Cause.pretty(cause)),
);
