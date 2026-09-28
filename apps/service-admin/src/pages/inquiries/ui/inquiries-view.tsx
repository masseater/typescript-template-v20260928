import { adminPageSize } from "@repo/config/paging";
import {
  NavigationLink,
  Page,
  PageNavigation,
  PaginationLink,
  STATUS_VARIANT,
  StatusMessage,
  formatWarekiDateTime,
  searchAtPage,
} from "@repo/ui";

import {
  INQUIRY_STATUS,
  inquiryStatusLabel,
  type InquiryStatus,
} from "#pages/inquiries/model/status-label.ts";

import type { InquiriesSearch } from "#pages/inquiries/model/inquiry-list.ts";
import type { AdminInquirySummary } from "#pages/inquiries/model/inquiry.ts";
import type { PageTarget } from "@repo/ui";
import type { ReactElement } from "react";

type InquiryPage = Readonly<{ inquiries: readonly AdminInquirySummary[]; total: number }>;

const statusFilters = [
  INQUIRY_STATUS.open,
  INQUIRY_STATUS.answered,
  INQUIRY_STATUS.closed,
] as const;

function InquiryPageLink({
  search,
  target,
}: Readonly<{ search: InquiriesSearch; target: PageTarget }>): ReactElement {
  return (
    <PaginationLink
      to="/inquiries"
      search={searchAtPage(search, target.page)}
      current={target.current}
      aria-label={target.label}
    >
      {target.text}
    </PaginationLink>
  );
}

function InquiryRange({ list, page }: Readonly<{ list: InquiryPage; page: number }>): ReactElement {
  const first = (page - 1) * adminPageSize + 1;
  const last = first + list.inquiries.length - 1;
  return (
    <p className="text-sm leading-normal text-muted-foreground">
      {`${list.total} 件中 ${first}〜${last} 件`}
    </p>
  );
}

function InquiriesView({
  error,
  list,
  onToggle,
  pendingCount,
  search,
}: Readonly<{
  error: string | undefined;
  list: InquiryPage | undefined;
  onToggle: (value: InquiryStatus) => void;
  pendingCount: number | undefined;
  search: InquiriesSearch;
}>): ReactElement {
  const { status } = search;
  const page = search.page ?? 1;
  const inquiries = list?.inquiries;
  function pageLink(target: PageTarget): ReactElement {
    return <InquiryPageLink search={search} target={target} />;
  }
  return (
    <Page title="問い合わせ">
      {pendingCount !== undefined && (
        <p className="text-sm leading-normal text-muted-foreground">対応待ち: {pendingCount} 件</p>
      )}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => {
              onToggle(value);
            }}
            className={`rounded-md border px-3 py-1 text-sm ${status === value ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
          >
            {inquiryStatusLabel(value)}
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
      {list !== undefined && list.inquiries.length > 0 && <InquiryRange list={list} page={page} />}
      {inquiries !== undefined && inquiries.length > 0 && (
        <table aria-label="問い合わせの一覧" className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-2">件名</th>
              <th className="p-2">経路</th>
              <th className="p-2">状態</th>
              <th className="p-2">相手</th>
              <th className="p-2">最終更新</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((inquiry) => (
              <tr key={inquiry.id} className="border-b border-border">
                <td className="p-2">
                  <NavigationLink to="/inquiries/$id" params={{ id: inquiry.id }} variant="item">
                    {inquiry.subject}
                  </NavigationLink>
                </td>
                <td className="p-2">会員</td>
                <td className="p-2">{inquiryStatusLabel(inquiry.status)}</td>
                <td className="p-2">{inquiry.memberName}</td>
                <td className="p-2">{formatWarekiDateTime(inquiry.updatedAt.getTime())}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {list !== undefined && (
        <PageNavigation
          current={page}
          last={Math.ceil(list.total / adminPageSize)}
          renderLink={pageLink}
        />
      )}
    </Page>
  );
}

export { InquiriesView };
