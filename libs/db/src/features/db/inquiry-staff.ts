import { INQUIRY_STATUS, type InquiryStatus } from "@repo/config";
import { count, desc, eq, gte, sql } from "drizzle-orm";
import { DateTime, Effect } from "effect";

import { query } from "./database.ts";
import { InquiryNotFound } from "./inquiry-not-found.ts";
import { inquiryThread, memberInquiryColumns } from "./inquiry-thread.ts";
import { inquiry, user } from "./schema.ts";

import type { InquiryMessage } from "./inquiry.ts";

type InquiryStatusCount = Readonly<Record<InquiryStatus, number>>;

const noInquiries: InquiryStatusCount = {
  [INQUIRY_STATUS.answered]: 0,
  [INQUIRY_STATUS.closed]: 0,
  [INQUIRY_STATUS.open]: 0,
};

const statusTally = (
  statusCounts: readonly Readonly<{ count: number; status: InquiryStatus }>[],
): InquiryStatusCount =>
  statusCounts.reduce<InquiryStatusCount>(
    (tally, statusCount) => ({ ...tally, [statusCount.status]: statusCount.count }),
    noInquiries,
  );

type InquiryDailyTrend = InquiryStatusCount & Readonly<{ day: string }>;

const dailyTrend = (
  dailyCounts: readonly Readonly<{ count: number; day: string; status: InquiryStatus }>[],
): readonly InquiryDailyTrend[] =>
  [...Map.groupBy(dailyCounts, (dailyCount) => dailyCount.day)].map(([day, dayCounts]) =>
    dayCounts.reduce<InquiryDailyTrend>(
      (daily, dayCount) => ({ ...daily, [dayCount.status]: dayCount.count }),
      { ...noInquiries, day },
    ),
  );

const staffInquiryCounts = Effect.fn("staffInquiryCounts")(function* staffInquiryCounts() {
  const statusCounts = yield* query((database) =>
    database
      .select({ count: count(), status: inquiry.status })
      .from(inquiry)
      .groupBy(inquiry.status),
  );
  const since = DateTime.toDate(
    DateTime.startOf(DateTime.subtract(yield* DateTime.now, { days: 30 }), "day"),
  );
  const dailyCounts = yield* query((database) =>
    database
      .select({
        count: count(),
        day: sql<string>`strftime('%Y-%m-%d', ${inquiry.createdAt} / 1000, 'unixepoch')`,
        status: inquiry.status,
      })
      .from(inquiry)
      .where(gte(inquiry.createdAt, since))
      .groupBy(sql`strftime('%Y-%m-%d', ${inquiry.createdAt} / 1000, 'unixepoch')`, inquiry.status)
      .orderBy(sql`strftime('%Y-%m-%d', ${inquiry.createdAt} / 1000, 'unixepoch')`),
  );
  return {
    byStatus: statusTally(statusCounts),
    trend: dailyTrend(dailyCounts),
  } satisfies Readonly<{
    byStatus: InquiryStatusCount;
    trend: readonly InquiryDailyTrend[];
  }>;
});

const staffListMemberInquiries = Effect.fn("staffListMemberInquiries")(
  function* staffListMemberInquiries(memberId: string) {
    const [member] = yield* query((database) =>
      database.select({ id: user.id }).from(user).where(eq(user.id, memberId)).limit(1),
    );
    if (!member) {
      return yield* new InquiryNotFound();
    }
    return yield* query((database) =>
      database
        .select(memberInquiryColumns)
        .from(inquiry)
        .where(eq(inquiry.memberId, memberId))
        .orderBy(desc(inquiry.updatedAt), inquiry.id),
    );
  },
);

const staffGetInquiry = Effect.fn("staffGetInquiry")(function* staffGetInquiry(inquiryId: string) {
  const found = query((database) =>
    database.select(memberInquiryColumns).from(inquiry).where(eq(inquiry.id, inquiryId)).limit(1),
  );
  return (yield* inquiryThread(inquiryId, found)) satisfies Readonly<{
    createdAt: Date;
    id: string;
    memberId: string;
    messages: readonly InquiryMessage[];
    status: InquiryStatus;
    subject: string;
    updatedAt: Date;
  }>;
});

const inquiryStaff = {
  getInquiry: staffGetInquiry,
  inquiryCounts: staffInquiryCounts,
  listMemberInquiries: staffListMemberInquiries,
};

export { inquiryStaff };
