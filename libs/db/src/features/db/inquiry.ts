import { maximumAdminPageSize } from "@repo/config";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { Effect, Schema } from "effect";

import { countRows } from "./count-rows.ts";
import { query } from "./database.ts";
import { InquiryNotFound } from "./inquiry-not-found.ts";
import { adminInquiryColumns, inquiryColumns, inquiryThread } from "./inquiry-thread.ts";
import { requireAdmin } from "./privileged-session.ts";
import { INQUIRY_STATUS, inquiry, inquiryStatuses, type InquiryStatus, user } from "./schema.ts";

export const InquiryPage = Schema.Struct({
  limit: Schema.Int.check(Schema.isBetween({ maximum: maximumAdminPageSize, minimum: 1 })),
  offset: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  status: Schema.optionalKey(Schema.Literals(inquiryStatuses)),
});

type InquirySummary = Readonly<{
  createdAt: Date;
  id: string;
  status: InquiryStatus;
  subject: string;
  updatedAt: Date;
}>;

type InquiryMessage = Readonly<{
  authorId: string;
  authorKind: "admin" | "member";
  body: string;
  createdAt: Date;
  id: string;
}>;

type InquiryThread = InquirySummary & Readonly<{ messages: readonly InquiryMessage[] }>;

type AdminInquirySummary = InquirySummary &
  Readonly<{
    memberId: string;
    memberName: string;
  }>;

type AdminInquiryThread = AdminInquirySummary & Readonly<{ messages: readonly InquiryMessage[] }>;

type MemberSummary = Readonly<{
  email: string;
  id: string;
  name: string;
}>;

const adminInquiryRows = Effect.fn("adminInquiryRows")(function* adminInquiryRows(
  where: () => SQL | undefined,
  window: Readonly<{ limit: number; offset: number }>,
) {
  return yield* query((database) =>
    database
      .select(adminInquiryColumns)
      .from(inquiry)
      .innerJoin(user, eq(inquiry.memberId, user.id))
      .where(where())
      .orderBy(desc(inquiry.updatedAt), inquiry.id)
      .limit(window.limit)
      .offset(window.offset),
  );
});

const listMemberInquiries = Effect.fn("listMemberInquiries")(function* listMemberInquiries(
  memberId: string,
) {
  return yield* query((database) =>
    database
      .select(inquiryColumns)
      .from(inquiry)
      .where(eq(inquiry.memberId, memberId))
      .orderBy(desc(inquiry.updatedAt), inquiry.id),
  );
});

const getMemberInquiry = Effect.fn("getMemberInquiry")(function* getMemberInquiry(
  memberId: string,
  inquiryId: string,
) {
  const found = query((database) =>
    database
      .select(inquiryColumns)
      .from(inquiry)
      .where(and(eq(inquiry.id, inquiryId), eq(inquiry.memberId, memberId)))
      .limit(1),
  );
  return (yield* inquiryThread(inquiryId, found)) satisfies InquiryThread;
});

const matchesInquiryPage = (page: typeof InquiryPage.Type): SQL | undefined => {
  const { status } = page;
  return status === undefined ? undefined : eq(inquiry.status, status);
};

const listAdminInquiries = Effect.fn("listAdminInquiries")(function* listAdminInquiries(
  sessionId: string,
  page: typeof InquiryPage.Type,
) {
  yield* requireAdmin(sessionId);
  const where = matchesInquiryPage(page);
  const inquiries = yield* adminInquiryRows(() => where, page);
  const matchingCount = yield* countRows(inquiry, () => where);
  return { inquiries, total: matchingCount };
});

const getAdminInquiry = Effect.fn("getAdminInquiry")(function* getAdminInquiry(
  sessionId: string,
  inquiryId: string,
) {
  yield* requireAdmin(sessionId);
  const found = adminInquiryRows(() => eq(inquiry.id, inquiryId), { limit: 1, offset: 0 });
  return (yield* inquiryThread(inquiryId, found)) satisfies AdminInquiryThread;
});

const countPendingInquiries = Effect.fn("countPendingInquiries")(function* countPendingInquiries(
  sessionId: string,
) {
  yield* requireAdmin(sessionId);
  return yield* countRows(inquiry, () => eq(inquiry.status, INQUIRY_STATUS.open));
});

const getInquiryMemberSummary = Effect.fn("getInquiryMemberSummary")(
  function* getInquiryMemberSummary(sessionId: string, memberId: string) {
    yield* requireAdmin(sessionId);
    const [member] = yield* query((database) =>
      database
        .select({ email: user.email, id: user.id, name: user.name })
        .from(user)
        .where(eq(user.id, memberId))
        .limit(1),
    );
    if (!member) {
      return yield* new InquiryNotFound();
    }
    return member satisfies MemberSummary;
  },
);

export {
  countPendingInquiries,
  getAdminInquiry,
  getInquiryMemberSummary,
  getMemberInquiry,
  listAdminInquiries,
  listMemberInquiries,
};
export { InquiryForbidden } from "./inquiry-forbidden.ts";
export { InquiryNotFound } from "./inquiry-not-found.ts";
export type {
  AdminInquirySummary,
  AdminInquiryThread,
  InquiryMessage,
  InquirySummary,
  InquiryThread,
  MemberSummary,
};
