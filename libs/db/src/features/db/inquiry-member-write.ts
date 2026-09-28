import { and, eq } from "drizzle-orm";
import { DateTime, Effect } from "effect";

import { query } from "./database.ts";
import { InquiryForbidden } from "./inquiry-forbidden.ts";
import { getMemberInquiry } from "./inquiry.ts";
import { INQUIRY_AUTHOR_KIND, INQUIRY_STATUS, inquiry, inquiryMessage } from "./schema.ts";

const createMemberInquiry = Effect.fn("createMemberInquiry")(function* createMemberInquiry(
  memberId: string,
  draft: { readonly body: string; readonly subject: string },
) {
  const inquiryId = crypto.randomUUID();
  const messageId = crypto.randomUUID();
  const openedAt = DateTime.toDate(yield* DateTime.now);
  yield* query((database) =>
    database.batch([
      database.insert(inquiry).values({
        createdAt: openedAt,
        id: inquiryId,
        memberId,
        status: INQUIRY_STATUS.open,
        subject: draft.subject,
        updatedAt: openedAt,
      }),
      database.insert(inquiryMessage).values({
        authorId: memberId,
        authorKind: INQUIRY_AUTHOR_KIND.member,
        body: draft.body,
        createdAt: openedAt,
        id: messageId,
        inquiryId,
      }),
    ]),
  );
  return yield* getMemberInquiry(memberId, inquiryId);
});

const replyAsMember = Effect.fn("replyAsMember")(function* replyAsMember({
  body: replyBody,
  inquiryId,
  memberId,
}: Readonly<{ body: string; inquiryId: string; memberId: string }>) {
  const thread = yield* getMemberInquiry(memberId, inquiryId);
  if (thread.status === INQUIRY_STATUS.closed) {
    return yield* new InquiryForbidden();
  }
  const repliedAt = DateTime.toDate(yield* DateTime.now);
  yield* query((database) =>
    database.batch([
      database.insert(inquiryMessage).values({
        authorId: memberId,
        authorKind: INQUIRY_AUTHOR_KIND.member,
        body: replyBody,
        createdAt: repliedAt,
        id: crypto.randomUUID(),
        inquiryId,
      }),
      database
        .update(inquiry)
        .set({ updatedAt: repliedAt })
        .where(and(eq(inquiry.id, inquiryId), eq(inquiry.memberId, memberId))),
    ]),
  );
  return yield* getMemberInquiry(memberId, inquiryId);
});

export { createMemberInquiry, replyAsMember };
