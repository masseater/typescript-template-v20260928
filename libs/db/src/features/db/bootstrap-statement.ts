import { Clock, Effect, Schema } from "effect";

import {
  BOOTSTRAP_KIND,
  BootstrapKind,
  BootstrappedAdmin,
  bootstrapStatement,
  ensureRoleStatement,
} from "./bootstrap-promotion.ts";
import { BootstrapUnavailable } from "./bootstrap-unavailable.ts";
import { DatabaseFailure } from "./database-failure.ts";
import { query } from "./database.ts";

import type { Email } from "@repo/config";

const bootstrapAdmin = Effect.fn("bootstrapAdmin")(function* bootstrapAdmin(
  email: typeof Email.Type,
  bootstrapKind: BootstrapKind = BOOTSTRAP_KIND.admin,
) {
  const updatedAt = yield* Clock.currentTimeMillis;
  const [promotedRow] = yield* query((database) =>
    database.all(bootstrapStatement({ bootstrapKind, email, updatedAt })),
  );
  if (promotedRow === undefined) {
    return yield* new BootstrapUnavailable();
  }
  return yield* Schema.decodeUnknownEffect(BootstrappedAdmin)(promotedRow).pipe(
    Effect.mapError((cause) => new DatabaseFailure({ cause })),
  );
});

const ensureAdminRole = Effect.fn("ensureAdminRole")(function* ensureAdminRole(
  email: typeof Email.Type,
  bootstrapKind: BootstrapKind = BOOTSTRAP_KIND.admin,
) {
  const updatedAt = yield* Clock.currentTimeMillis;
  const [adminRow] = yield* query((database) =>
    database.all(ensureRoleStatement({ bootstrapKind, email, updatedAt })),
  );
  if (adminRow === undefined) {
    return yield* new BootstrapUnavailable();
  }
  return yield* Schema.decodeUnknownEffect(BootstrappedAdmin)(adminRow).pipe(
    Effect.mapError((cause) => new DatabaseFailure({ cause })),
  );
});

export { BOOTSTRAP_KIND, BootstrapKind, bootstrapAdmin, ensureAdminRole };
