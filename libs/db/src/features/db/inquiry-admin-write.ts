import { ADMIN_PERMISSION, AUDIT_ACTION } from "@repo/config";
import { eq, sql, type SQL } from "drizzle-orm";
import { DateTime, Effect } from "effect";

import { query, type DrizzleDatabase } from "./database.ts";
import { InquiryForbidden } from "./inquiry-forbidden.ts";
import { InquiryNotFound } from "./inquiry-not-found.ts";
import { getAdminInquiry } from "./inquiry.ts";
import { liveAdmin, requireAdmin } from "./privileged-session.ts";
import {
  auditEvent,
  INQUIRY_AUTHOR_KIND,
  INQUIRY_STATUS,
  inquiry,
  inquiryMessage,
  type AuditAction,
} from "./schema.ts";

const auditInquiryReply = (
  database: DrizzleDatabase,
  {
    action,
    actorId,
    checkedAt,
    inquiryId,
    sessionId,
  }: Readonly<{
    action: AuditAction;
    actorId: string;
    checkedAt: Date;
    inquiryId: string;
    sessionId: string;
  }>,
): SQL => {
  const auditColumns = [
    [auditEvent.action, action],
    [auditEvent.actorId, actorId],
    [auditEvent.createdAt, checkedAt.getTime()],
    [auditEvent.id, crypto.randomUUID()],
    [auditEvent.targetId, inquiryId],
  ] as const;
  const columnNames = sql.join(
    auditColumns.map(([column]) => sql.identifier(column.name)),
    sql`, `,
  );
  const columnValues = sql.join(
    auditColumns.map(([, columnValue]) => sql`${columnValue}`),
    sql`, `,
  );
  const targeted = sql`SELECT 1 FROM ${inquiry} WHERE ${inquiry.id} = ${inquiryId} AND ${liveAdmin(database, { checkedAt, required: ADMIN_PERMISSION.operator, sessionId })}`;
  return sql`INSERT INTO ${auditEvent} (${columnNames}) SELECT ${columnValues} WHERE EXISTS (${targeted})`;
};

const replyAsAdmin = Effect.fn("replyAsAdmin")(function* replyAsAdmin({
  body: replyBody,
  inquiryId,
  sessionId,
}: Readonly<{ body: string; inquiryId: string; sessionId: string }>) {
  const actor = yield* requireAdmin(sessionId, ADMIN_PERMISSION.operator);
  const [existing] = yield* query((database) =>
    database
      .select({ id: inquiry.id, status: inquiry.status })
      .from(inquiry)
      .where(eq(inquiry.id, inquiryId))
      .limit(1),
  );
  if (!existing) {
    return yield* new InquiryNotFound();
  }
  if (existing.status === INQUIRY_STATUS.closed) {
    return yield* new InquiryForbidden();
  }
  const repliedAt = DateTime.toDate(yield* DateTime.now);
  const change = {
    action: AUDIT_ACTION.inquiryReplied,
    actorId: actor.user.id,
    checkedAt: repliedAt,
    inquiryId,
    sessionId,
  } as const;
  yield* query((database) =>
    database.batch([
      database.run(auditInquiryReply(database, change)),
      database.insert(inquiryMessage).values({
        authorId: actor.user.id,
        authorKind: INQUIRY_AUTHOR_KIND.admin,
        body: replyBody,
        createdAt: repliedAt,
        id: crypto.randomUUID(),
        inquiryId,
      }),
      database
        .update(inquiry)
        .set({ status: INQUIRY_STATUS.answered, updatedAt: repliedAt })
        .where(eq(inquiry.id, inquiryId)),
    ]),
  );
  return yield* getAdminInquiry(sessionId, inquiryId);
});

const closeInquiry = Effect.fn("closeInquiry")(function* closeInquiry(
  sessionId: string,
  inquiryId: string,
) {
  yield* requireAdmin(sessionId, ADMIN_PERMISSION.operator);
  const closedAt = DateTime.toDate(yield* DateTime.now);
  const [closed] = yield* query((database) =>
    database
      .update(inquiry)
      .set({ status: INQUIRY_STATUS.closed, updatedAt: closedAt })
      .where(eq(inquiry.id, inquiryId))
      .returning({ id: inquiry.id }),
  );
  if (!closed) {
    return yield* new InquiryNotFound();
  }
  return yield* getAdminInquiry(sessionId, inquiryId);
});

export { closeInquiry, replyAsAdmin };
