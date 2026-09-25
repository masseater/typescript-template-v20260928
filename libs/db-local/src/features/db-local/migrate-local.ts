#!/usr/bin/env node
import { reportFailed, runCli } from "@repo/cli";
import { Cause, Console, Effect, Schema } from "effect";

import { migrateLocalDatabase } from "./migrate-local-database.ts";

const failed = (failureCode: string): Readonly<Record<string, unknown>> => ({
  action: "local_migration",
  error: failureCode,
  success: false,
});

runCli(
  Effect.gen(function* program() {
    const applied = yield* migrateLocalDatabase;
    yield* Console.log(
      yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))({
        action: "local_migration",
        applied,
        success: true,
      }),
    );
  }).pipe(Effect.catchTag("RemoteFailure", (failure) => reportFailed(failed(failure.code)))),
  (cause) => ({ ...failed("LOCAL_MIGRATION_FAILED"), cause: Cause.pretty(cause) }),
);
