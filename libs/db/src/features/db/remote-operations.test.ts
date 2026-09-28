import { NodeServices } from "@effect/platform-node";
import { APPLICATION, AUTHENTICATION_METHOD } from "@repo/config";
import { EmptyTestDatabase, TestBinding, deployMigrations, runStatement } from "@repo/db-local";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { DateTime, Effect, FileSystem, Path } from "effect";
import { TestClock } from "effect/testing";
import { describe, expect, test } from "vite-plus/test";

import { bootstrapAdmin, BootstrapUnavailable } from "./bootstrap-statement.ts";
import { query } from "./database.ts";
import {
  RemoteFailure,
  bootstrapDatabase,
  loadRemoteMigrations,
  migrateD1,
  migrationsFolder,
} from "./remote-operations.ts";
import { session, user } from "./schema.ts";
import { getSessionSecurity } from "./security.ts";

const copiedMigrations = Effect.gen(function* copyMigrations() {
  const filesystem = yield* FileSystem.FileSystem;
  const folder = yield* filesystem.makeTempDirectoryScoped({ prefix: "template-migrations-" });
  yield* filesystem.copy(migrationsFolder, folder);
  return folder;
});

describe("migrateD1", () => {
  describe("a first migration of an empty database", () => {
    const it = test
      .extend("migrationCount", async () =>
        Effect.runPromise(Effect.map(loadRemoteMigrations(), (migrations) => migrations.length)))
      .extend("appliedCount", async () =>
        Effect.runPromise(
          Effect.gen(function* migrateOnce() {
            return yield* migrateD1(yield* TestBinding);
          }).pipe(Effect.provide(EmptyTestDatabase)),
        ),
      );

    it("applies every migration", { timeout: 60_000 }, ({ appliedCount, migrationCount }) => {
      expect(appliedCount).toBe(migrationCount);
    });
  });

  describe("a second migration of an up to date database", () => {
    const it = test.extend("appliedCount", async () =>
      Effect.runPromise(
        Effect.gen(function* migrateTwice() {
          const binding = yield* TestBinding;
          yield* migrateD1(binding);
          return yield* migrateD1(binding);
        }).pipe(Effect.provide(EmptyTestDatabase)),
      ));

    it("applies nothing", { timeout: 60_000 }, ({ appliedCount }) => {
      expect(appliedCount).toBe(0);
    });
  });

  describe("a migration whose second statement fails", () => {
    const it = test.extend("migrationFailure", () =>
      Effect.runPromise(
        Effect.gen(function* interrupt() {
          const filesystem = yield* FileSystem.FileSystem;
          const paths = yield* Path.Path;
          const folder = yield* copiedMigrations;
          const interrupted = paths.join(folder, "99999999999999_interrupted");
          yield* filesystem.makeDirectory(interrupted);
          yield* filesystem.writeFileString(
            paths.join(interrupted, "migration.sql"),
            "CREATE TABLE interrupted_migration (id TEXT);\n--> statement-breakpoint\nINSERT INTO missing_migration_table VALUES (1);",
          );
          const binding = yield* TestBinding;
          yield* migrateD1(binding);
          return yield* Effect.flip(migrateD1(binding, folder));
        }).pipe(Effect.scoped, Effect.provide([EmptyTestDatabase, NodeServices.layer])),
      ));

    it("fails as a query failure", { timeout: 60_000 }, ({ migrationFailure }) => {
      expect(migrationFailure).toStrictEqual(new RemoteFailure({ code: "REMOTE_QUERY_FAILED" }));
    });
  });

  describe("the database after a migration whose second statement failed", () => {
    const it = test.extend("interruptedTables", () =>
      Effect.runPromise(
        Effect.gen(function* interrupt() {
          const filesystem = yield* FileSystem.FileSystem;
          const paths = yield* Path.Path;
          const folder = yield* copiedMigrations;
          const interrupted = paths.join(folder, "99999999999999_interrupted");
          yield* filesystem.makeDirectory(interrupted);
          yield* filesystem.writeFileString(
            paths.join(interrupted, "migration.sql"),
            "CREATE TABLE interrupted_migration (id TEXT);\n--> statement-breakpoint\nINSERT INTO missing_migration_table VALUES (1);",
          );
          const binding = yield* TestBinding;
          yield* migrateD1(binding);
          yield* Effect.exit(migrateD1(binding, folder));
          const listing = yield* runStatement(
            "SELECT name FROM sqlite_master WHERE name = ?",
            "interrupted_migration",
          );
          return listing.results;
        }).pipe(Effect.scoped, Effect.provide([EmptyTestDatabase, NodeServices.layer])),
      ));

    it("keeps nothing of the failed migration", { timeout: 60_000 }, ({ interruptedTables }) => {
      expect(interruptedTables).toStrictEqual([]);
    });
  });

  describe("migrations whose already applied history changed", () => {
    const it = test.extend("migrationFailure", () =>
      Effect.runPromise(
        Effect.gen(function* rewriteHistory() {
          const filesystem = yield* FileSystem.FileSystem;
          const paths = yield* Path.Path;
          const folder = yield* copiedMigrations;
          const binding = yield* TestBinding;
          const [first] = yield* loadRemoteMigrations();
          yield* migrateD1(binding);
          if (first === undefined) {
            return new RemoteFailure({ code: "REMOTE_MIGRATIONS_INVALID" });
          }
          yield* filesystem.writeFileString(paths.join(folder, first.name, "migration.sql"), "\n", {
            flag: "a",
          });
          return yield* Effect.flip(migrateD1(binding, folder));
        }).pipe(Effect.scoped, Effect.provide([EmptyTestDatabase, NodeServices.layer])),
      ));

    it("are refused", { timeout: 60_000 }, ({ migrationFailure }) => {
      expect(migrationFailure).toStrictEqual(
        new RemoteFailure({ code: "REMOTE_MIGRATION_HISTORY_MISMATCH" }),
      );
    });
  });

  describe("a database carrying application tables without a recorded history", () => {
    const it = test.extend("migrationFailure", async () =>
      Effect.runPromise(
        Effect.gen(function* migrateUnrecorded() {
          yield* runStatement("CREATE TABLE user (id TEXT PRIMARY KEY)");
          return yield* Effect.flip(migrateD1(yield* TestBinding));
        }).pipe(Effect.provide(EmptyTestDatabase)),
      ));

    it("is refused", { timeout: 60_000 }, ({ migrationFailure }) => {
      expect(migrationFailure).toStrictEqual(
        new RemoteFailure({ code: "REMOTE_MIGRATION_HISTORY_MISSING" }),
      );
    });
  });
});

describe("bootstrapDatabase", () => {
  describe.for([
    ["an unverified user", "unverified@example.test"],
    ["a user who does not exist", "missing@example.test"],
    ["a second verified user after the first was promoted", "second@example.test"],
  ] as const)("%s", ([, email]) => {
    const it = test.extend("bootstrapFailure", async () =>
      Effect.runPromise(
        Effect.gen(function* bootstrapOther() {
          const binding = yield* TestBinding;
          const database = drizzle(binding);
          const seededAt = DateTime.toDate(DateTime.makeUnsafe("2026-09-20T00:00:00.000Z"));
          yield* deployMigrations(binding);
          yield* query(async (database): Promise<void> => {
            await database.insert(user).values(
              [
                { id: "unverified", verified: false },
                { id: "first", verified: true },
                { id: "second", verified: true },
              ].map((seeded) => ({
                createdAt: seededAt,
                email: `${seeded.id}@example.test`,
                emailVerified: seeded.verified,
                id: seeded.id,
                name: seeded.id,
                updatedAt: seededAt,
              })),
            );
          });
          yield* bootstrapDatabase({ database: database, email: "FIRST@example.test" });
          return yield* Effect.flip(bootstrapDatabase({ database: database, email: email }));
        }).pipe(Effect.provide(EmptyTestDatabase)),
      ));

    it("is refused", { timeout: 60_000 }, ({ bootstrapFailure }) => {
      expect(bootstrapFailure).toStrictEqual(
        new RemoteFailure({ code: "BOOTSTRAP_REQUIRES_VERIFIED_USER_AND_NO_ADMIN" }),
      );
    });
  });

  describe("the session a user opened before being promoted", () => {
    const it = test.extend("earlierSession", async () =>
      Effect.runPromise(
        Effect.gen(function* promoteFirst() {
          const binding = yield* TestBinding;
          const database = drizzle(binding);
          const seededAt = DateTime.toDate(DateTime.makeUnsafe("2026-09-20T00:00:00.000Z"));
          yield* TestClock.setTime(seededAt.getTime());
          yield* deployMigrations(binding);
          yield* query(async (database): Promise<void> => {
            await database.insert(user).values({
              createdAt: seededAt,
              email: "first@example.test",
              emailVerified: true,
              id: "first",
              name: "first",
              updatedAt: seededAt,
            });
            await database.insert(session).values({
              audience: APPLICATION.user,
              authenticationMethod: AUTHENTICATION_METHOD.password,
              createdAt: seededAt,
              expiresAt: new Date(seededAt.getTime() + 60_000),
              id: "old-session",
              securityVersion: 0,
              token: "old-session-token",
              updatedAt: seededAt,
              userId: "first",
            });
          });
          yield* bootstrapDatabase({ database: database, email: "FIRST@example.test" });
          return yield* getSessionSecurity("old-session", APPLICATION.user);
        }).pipe(Effect.provide([EmptyTestDatabase, TestClock.layer()])),
      ));

    it("is revoked", { timeout: 60_000 }, ({ earlierSession }) => {
      expect(earlierSession).toBe(undefined);
    });
  });

  describe("the local bootstrap after a remote one", () => {
    const it = test.extend("bootstrapFailure", async () =>
      Effect.runPromise(
        Effect.gen(function* bootstrapAgain() {
          const binding = yield* TestBinding;
          const database = drizzle(binding);
          const seededAt = DateTime.toDate(DateTime.makeUnsafe("2026-09-20T00:00:00.000Z"));
          yield* deployMigrations(binding);
          yield* query(async (database): Promise<void> => {
            await database.insert(user).values(
              ["first", "second"].map((userId) => ({
                createdAt: seededAt,
                email: `${userId}@example.test`,
                emailVerified: true,
                id: userId,
                name: userId,
                updatedAt: seededAt,
              })),
            );
          });
          yield* bootstrapDatabase({ database: database, email: "first@example.test" });
          return yield* Effect.flip(bootstrapAdmin("second@example.test"));
        }).pipe(Effect.provide(EmptyTestDatabase)),
      ));

    it("is unavailable", { timeout: 60_000 }, ({ bootstrapFailure }) => {
      expect(bootstrapFailure).toStrictEqual(new BootstrapUnavailable());
    });
  });
});

describe("the last administrator guard of the migrated database", () => {
  describe.for([
    ["a direct delete", "DELETE FROM user WHERE id = ?"],
    ["a direct demotion", "UPDATE user SET role = 'member' WHERE id = ?"],
  ] as const)("%s of the only administrator", ([, statement]) => {
    const it = test.extend("remainingAdministrator", async () =>
      Effect.runPromise(
        Effect.gen(function* removeLast() {
          const binding = yield* TestBinding;
          const database = drizzle(binding);
          const seededAt = DateTime.toDate(DateTime.makeUnsafe("2026-09-20T00:00:00.000Z"));
          yield* deployMigrations(binding);
          yield* query(async (database): Promise<void> => {
            await database.insert(user).values({
              createdAt: seededAt,
              email: "first@example.test",
              emailVerified: true,
              id: "first",
              name: "first",
              updatedAt: seededAt,
            });
          });
          yield* bootstrapDatabase({ database: database, email: "first@example.test" });
          yield* Effect.exit(runStatement(statement, "first"));
          return yield* query(async (database) =>
            database.select({ role: user.role }).from(user).where(eq(user.id, "first")),
          );
        }).pipe(Effect.provide(EmptyTestDatabase)),
      ));

    it("is refused by the database", { timeout: 60_000 }, ({ remainingAdministrator }) => {
      expect(remainingAdministrator).toStrictEqual([{ role: "admin" }]);
    });
  });
});
