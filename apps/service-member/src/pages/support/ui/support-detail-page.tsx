import {
  Heading,
  Page,
  STATUS_VARIANT,
  StatusMessage,
  TextLink,
  formatWarekiDateTime,
} from "@repo/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { inquiryThreadOptions, supportInquiriesKey } from "#pages/support/api/support.ts";
import { InquiryReplyForm } from "./inquiry-reply-form.tsx";

import type { ReactElement } from "react";

function SupportDetailPage({ inquiryId }: Readonly<{ inquiryId: string }>): ReactElement {
  const thread = useQuery(inquiryThreadOptions(inquiryId));
  const queries = useQueryClient();
  const error = thread.error?.message;
  function reload(): void {
    void queries.invalidateQueries({ queryKey: supportInquiriesKey });
  }

  if (error !== undefined) {
    return (
      <Page title="お問い合わせ">
        <StatusMessage variant={STATUS_VARIANT.failure}>{error}</StatusMessage>
        <TextLink to="/support">一覧へ</TextLink>
      </Page>
    );
  }

  const inquiry = thread.data;
  if (inquiry === undefined) {
    return (
      <Page title="お問い合わせ">
        <StatusMessage variant={STATUS_VARIANT.pending}>読み込み中です。</StatusMessage>
      </Page>
    );
  }

  return (
    <Page title="お問い合わせ">
      <TextLink to="/support">一覧へ</TextLink>
      <Heading as="h2" size="section">
        {inquiry.subject}
      </Heading>
      <p className="text-sm leading-normal text-muted-foreground">{inquiry.statusLabel}</p>
      <ul className="flex flex-col gap-3">
        {inquiry.messages.map((message) => (
          <li
            key={message.id}
            className={`rounded-lg border border-border p-3 ${message.fromOperator ? "bg-muted" : ""}`}
          >
            <p className="text-sm leading-normal font-medium">
              {message.fromOperator ? "運営" : "自分"}
            </p>
            <p className="text-base leading-normal whitespace-pre-wrap">{message.body}</p>
            <p className="text-xs leading-normal text-muted-foreground">
              {formatWarekiDateTime(message.createdAt.getTime())}
            </p>
          </li>
        ))}
      </ul>
      {!inquiry.closed && <InquiryReplyForm inquiryId={inquiryId} onReplied={reload} />}
    </Page>
  );
}

export { SupportDetailPage };
