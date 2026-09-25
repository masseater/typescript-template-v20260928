import { causeRecord } from "@repo/cli";
import { Cause, Effect } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { databaseMigrationFailed } from "./failure.ts";

describe("a local database migration that failed", () => {
  it("keeps what the migration reported in the failure record", async () => {
    const migrationFailure = await Effect.runPromise(
      Effect.flip(
        Effect.fail(new Error("D1_ERROR: no such table: users")).pipe(
          Effect.mapError(databaseMigrationFailed),
        ),
      ),
    );

    expect(
      causeRecord("local.application_command_failed", { cause: Cause.fail(migrationFailure) }),
    ).toMatchObject({
      cause: expect.stringContaining("D1_ERROR: no such table: users"),
      event: "local.application_command_failed",
      ok: false,
    });
  });
});
