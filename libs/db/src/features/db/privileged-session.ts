import {
  ACCOUNT_STATE,
  APPLICATION,
  ROLE,
  grantingPermissions,
  operationVerdict,
  strongAuthenticationMethods,
  type AdminOperation,
  type Application,
  type PrivilegedOperation,
  type Role,
  type StaffOperation,
} from "@repo/config";
import { and, eq, exists, gt, inArray, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { Effect } from "effect";

import { AdminStrongSessionRequired } from "./admin-strong-session-required.ts";
import { PermissionRequired } from "./permission-required.ts";
import { session, user } from "./schema.ts";
import { getSessionSecurity } from "./security.ts";

import type { DrizzleDatabase } from "./database.ts";

type Privilege = Readonly<{
  audience: Application;
  role: Role;
}>;

const adminPrivilege: Privilege = {
  audience: APPLICATION.admin,
  role: ROLE.administrator,
};

const staffPrivilege: Privilege = {
  audience: APPLICATION.wiki,
  role: ROLE.staff,
};

const requireActor = Effect.fn("requireActor")(function* requireActor(
  privilege: Privilege,
  demand: Readonly<{ operation: PrivilegedOperation; sessionId: string }>,
) {
  const { operation, sessionId } = demand;
  const actor = yield* getSessionSecurity(sessionId, privilege.audience);
  if (
    actor?.user.role !== privilege.role ||
    actor.user.accountState !== ACCOUNT_STATE.active ||
    !actor.user.emailVerified ||
    !strongAuthenticationMethods.some((method) => method === actor.session.authenticationMethod)
  ) {
    return yield* new AdminStrongSessionRequired();
  }
  const verdict = operationVerdict(operation, actor.user.permission);
  if (!verdict.permitted) {
    return yield* new PermissionRequired({ required: verdict.required });
  }
  return actor;
});

const requireAdmin = (
  sessionId: string,
  operation: AdminOperation,
): ReturnType<typeof requireActor> => requireActor(adminPrivilege, { operation, sessionId });

const requireStaff = (
  sessionId: string,
  operation: StaffOperation,
): ReturnType<typeof requireActor> => requireActor(staffPrivilege, { operation, sessionId });

type LiveCheck<Operation extends PrivilegedOperation> = Readonly<{
  checkedAt: Date;
  operation: Operation;
  sessionId: string;
}>;

const liveActor = (
  database: DrizzleDatabase,
  check: Readonly<{
    checkedAt: Date;
    operation: PrivilegedOperation;
    privilege: Privilege;
    sessionId: string;
  }>,
): SQL => {
  const { checkedAt, operation, privilege, sessionId } = check;
  const actor = alias(user, "actor");
  const liveSession = and(
    eq(session.id, sessionId),
    eq(session.audience, privilege.audience),
    eq(actor.role, privilege.role),
    eq(actor.accountState, ACCOUNT_STATE.active),
    eq(actor.emailVerified, true),
    inArray(actor.permission, grantingPermissions(operation)),
    eq(session.securityVersion, actor.securityVersion),
    gt(session.expiresAt, checkedAt),
    inArray(session.authenticationMethod, strongAuthenticationMethods),
  );
  const sessions = database
    .select({ id: session.id })
    .from(session)
    .innerJoin(actor, eq(session.userId, actor.id))
    .where(liveSession);
  return exists(sessions);
};

const liveAdmin = (database: DrizzleDatabase, check: LiveCheck<AdminOperation>): SQL =>
  liveActor(database, { ...check, privilege: adminPrivilege });

const liveStaff = (database: DrizzleDatabase, check: LiveCheck<StaffOperation>): SQL =>
  liveActor(database, { ...check, privilege: staffPrivilege });

export { liveAdmin, liveStaff, requireAdmin, requireStaff };
export type { LiveCheck };
