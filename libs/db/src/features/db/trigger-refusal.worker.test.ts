import { ADMIN_PERMISSION, APPLICATION, ROLE } from "@repo/config";
import { eq, sql } from "drizzle-orm";
import { DateTime, Effect } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { inviteAdmin } from "./admin.ts";
import { TestDatabase } from "./database-test-fixture.ts";
import { query } from "./database.ts";
import { acceptInvite } from "./invite.ts";
import { addSession, addUser } from "./records-test-fixture.ts";
import { invite } from "./schema.ts";
import { TRIGGER_REFUSAL, triggerRefusals } from "./trigger-refusal.ts";

const raisedWord = /RAISE\(ABORT,\s*'([^']+)'\)/gu;

describe("the trigger refusal vocabulary", () => {
  const it = test.extend("raisedWords", () =>
    Effect.runPromise(
      Effect.gen(function* collectRaisedWords() {
        const triggers = yield* query((database) =>
          database.all<{ sql: string }>(
            sql`select sql from sqlite_master where type = 'trigger' and sql is not null`,
          ),
        );
        return [
          ...new Set(
            triggers.flatMap((trigger) =>
              [...trigger.sql.matchAll(raisedWord)].map((raised) => raised[1] ?? ""),
            ),
          ),
        ].toSorted();
      }).pipe(Effect.provide(TestDatabase)),
    ),
  );

  it("names every word a trigger raises", ({ raisedWords }) => {
    expect(raisedWords).toStrictEqual(triggerRefusals.toSorted());
  });
});

describe("an invite accepted a second time behind the application's back", () => {
  const it = test.extend("secondAcceptance", () =>
    Effect.runPromise(
      Effect.gen(function* acceptTwiceInTheDatabase() {
        yield* addUser({ role: ROLE.administrator, userId: "owner" });
        const sessionId = yield* addSession({ audience: APPLICATION.admin, userId: "owner" });
        const issued = yield* inviteAdmin({
          email: "twice@example.com",
          permission: ADMIN_PERMISSION.operator,
          sessionId,
        });
        yield* acceptInvite({
          audience: APPLICATION.admin,
          name: "Twice",
          passwordHash: "hashed",
          rawToken: issued.token,
        });
        const refused = yield* query((database) =>
          database
            .update(invite)
            .set({ acceptedAt: DateTime.toDate(DateTime.makeUnsafe("2026-09-25T00:00:00.000Z")) })
            .where(eq(invite.id, issued.id)),
        ).pipe(Effect.flip);
        return refused.refusal;
      }).pipe(Effect.provide(TestDatabase)),
    ),
  );

  it("is stopped by the trigger with its own refusal", ({ secondAcceptance }) => {
    expect(secondAcceptance).toBe(TRIGGER_REFUSAL.inviteConsumed);
  });
});
