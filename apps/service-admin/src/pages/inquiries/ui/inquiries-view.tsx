import { inquiryStatusLabels, inquiryStatuses, type InquiryStatus } from "@repo/config";
import {
  NavigationLink,
  Page,
  STATUS_VARIANT,
  StatusMessage,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatWarekiDateTime,
} from "@repo/ui";

import type { AdminInquirySummary } from "#pages/inquiries/model/inquiry.ts";
import type { ReactElement } from "react";

function InquiriesView({
  error,
  inquiries,
  onToggle,
  pendingCount,
  status,
}: Readonly<{
  error: string | undefined;
  inquiries: readonly AdminInquirySummary[] | undefined;
  onToggle: (value: InquiryStatus) => void;
  pendingCount: number | undefined;
  status: InquiryStatus | undefined;
}>): ReactElement {
  return (
    <Page title="問い合わせ">
      {pendingCount !== undefined && (
        <p className="text-sm leading-normal text-muted-foreground">対応待ち: {pendingCount} 件</p>
      )}
      <div className="flex flex-wrap gap-2">
        {inquiryStatuses.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => {
              onToggle(value);
            }}
            className={`rounded-md border px-3 py-1 text-sm ${status === value ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
          >
            {inquiryStatusLabels[value]}
          </button>
        ))}
      </div>
      {error !== undefined && <p className="text-sm text-destructive">{error}</p>}
      {inquiries === undefined && error === undefined && (
        <StatusMessage variant={STATUS_VARIANT.pending}>読み込み中です。</StatusMessage>
      )}
      {inquiries !== undefined && inquiries.length === 0 && (
        <StatusMessage variant={STATUS_VARIANT.empty}>
          条件に一致する問い合わせはありません。
        </StatusMessage>
      )}
      {inquiries !== undefined && inquiries.length > 0 && (
        <Table label="問い合わせの一覧">
          <TableHeader>
            <TableRow>
              <TableHead>件名</TableHead>
              <TableHead>経路</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>相手</TableHead>
              <TableHead>最終更新</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inquiries.map((inquiry) => (
              <TableRow key={inquiry.id}>
                <TableCell>
                  <NavigationLink to="/inquiries/$id" params={{ id: inquiry.id }} variant="item">
                    {inquiry.subject}
                  </NavigationLink>
                </TableCell>
                <TableCell>会員</TableCell>
                <TableCell>{inquiryStatusLabels[inquiry.status]}</TableCell>
                <TableCell>{inquiry.memberName}</TableCell>
                <TableCell>{formatWarekiDateTime(inquiry.updatedAt.getTime())}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Page>
  );
}

export { InquiriesView };
