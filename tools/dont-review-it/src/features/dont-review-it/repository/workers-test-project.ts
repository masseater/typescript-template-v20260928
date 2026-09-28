import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { NodeServices } from "@effect/platform-node";
import {
  APPLICATION,
  coreEntrypoints,
  jobsQueueBinding,
  jobsQueueName,
  jobsWorkflowBinding,
  jobsWorkflowClass,
  jobsWorkflowName,
} from "@repo/config";
import { userInboxBinding, userInboxClassName } from "@repo/config/realtime";
import { localCacheNamespace, localFileBucket } from "@repo/config/storage";
import { workerCompatibility } from "@repo/config/worker";
import { localDatabase } from "@repo/db/local";
import { loadRemoteMigrations } from "@repo/db/migrations";
import { monitorBinding } from "@repo/monitor";
import { elysiaWorkerdJit } from "@repo/vite-config";
import { Effect, FileSystem, Path } from "effect";
import { kCurrentWorker } from "miniflare";
import { defineProject } from "vite-plus/test/config";

import { filePathOf } from "../platform/path.ts";
import { repositoryRoot } from "./repository-root.ts";
import { workerTests } from "./test-runtime.ts";
import { workersTestMainSource } from "./workers-test-main.ts";

const mailRecorder = "MailRecorder";
const probeMonitor = "ProbeMonitor";

const writtenMain = Effect.fn("writtenMain")(function* writtenMain(root: string) {
  const filesystem = yield* FileSystem.FileSystem;
  const paths = yield* Path.Path;
  const directory = paths.join(root, "node_modules", ".cache", "workers-test");
  const main = paths.join(directory, "main.ts");
  const source = yield* workersTestMainSource(root);
  const current = yield* filesystem
    .readFileString(main)
    .pipe(Effect.orElseSucceed(() => undefined));
  if (current !== source) {
    yield* filesystem.makeDirectory(directory, { recursive: true });
    yield* filesystem.writeFileString(main, source);
  }
  return main;
});

const workersTestProject = async (): Promise<ReturnType<typeof defineProject>> => {
  const { loaded, main } = await Effect.runPromise(
    Effect.all({
      loaded: loadRemoteMigrations(),
      main: writtenMain(repositoryRoot),
    }).pipe(Effect.provide(NodeServices.layer), Effect.orDie),
  );
  return defineProject({
    plugins: [
      elysiaWorkerdJit(),
      cloudflareTest({
        additionalExports: {
          [coreEntrypoints[APPLICATION.wiki]]: "WorkerEntrypoint",
          [jobsWorkflowClass]: "WorkflowEntrypoint",
          [mailRecorder]: "WorkerEntrypoint",
        },
        main,
        miniflare: {
          bindings: {
            ALERT_FROM: "monitor@example.test",
            ALERT_TO: "operator@example.test,oncall@example.test",
            D1_MIGRATIONS: loaded.map((migration) => ({
              name: migration.name,
              queries: [...migration.sql],
            })),
          },
          compatibilityDate: workerCompatibility.date,
          compatibilityFlags: [...workerCompatibility.flags],
          d1Databases: { [localDatabase.binding]: localDatabase.database_id },
          durableObjects: {
            [monitorBinding]: { className: probeMonitor, useSQLite: true },
            [userInboxBinding]: { className: userInboxClassName, useSQLite: true },
          },
          kvNamespaces: { [localCacheNamespace.binding]: localCacheNamespace.id },
          outboundService: (outbound: { readonly url: string }) =>
            Response.json({ blocked: outbound.url }, { status: 403 }),
          queueConsumers: {
            [jobsQueueName]: { maxBatchSize: 10, maxRetries: 3 },
          },
          queueProducers: { [jobsQueueBinding]: jobsQueueName },
          r2Buckets: { [localFileBucket.binding]: localFileBucket.bucket_name },
          serviceBindings: {
            CORE: { entrypoint: coreEntrypoints[APPLICATION.wiki], name: kCurrentWorker },
            EMAIL: { entrypoint: mailRecorder, name: kCurrentWorker },
          },
          workflows: {
            [jobsWorkflowBinding]: {
              className: jobsWorkflowClass,
              name: jobsWorkflowName,
            },
          },
        },
      }),
    ],
    test: {
      include: [`libs/${workerTests}`, `infra/${workerTests}`, `apps/${workerTests}`],
      name: "workers",
      root: repositoryRoot,
      setupFiles: [filePathOf(new URL("../vitest/parsed-fields-test-fixture.ts", import.meta.url))],
      testTimeout: 30_000,
    },
  });
};

export { workersTestProject };
