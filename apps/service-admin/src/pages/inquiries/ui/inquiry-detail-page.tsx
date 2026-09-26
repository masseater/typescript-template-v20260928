import { useQuery, useQueryClient } from "@tanstack/react-query";

import { inquiryListOptions, inquiryThreadOptions } from "#pages/inquiries/api/inquiries.ts";
import { inquiryListQuery } from "#pages/inquiries/model/inquiry-list.ts";
import { inquiriesKey } from "#shared/api/index.ts";
import { InquiryDetailView } from "./inquiry-detail-view.tsx";
import { InquiryMemberSummary } from "./inquiry-member-summary.tsx";
import { InquiryReplyForm } from "./inquiry-reply-form.tsx";

import type { ReactElement } from "react";

function InquiryDetailPage({ inquiryId }: Readonly<{ inquiryId: string }>): ReactElement {
  const queries = useQueryClient();
  const listing = useQuery(inquiryListOptions(inquiryListQuery({})));
  const thread = useQuery(inquiryThreadOptions(inquiryId));
  function refresh(): void {
    void queries.invalidateQueries({ queryKey: inquiriesKey });
  }
  return (
    <InquiryDetailView
      error={thread.error?.message ?? listing.error?.message}
      inquiries={listing.data?.inquiries}
      inquiry={thread.data}
      memberSummary={(memberId) => <InquiryMemberSummary memberId={memberId} />}
      replyForm={<InquiryReplyForm inquiryId={inquiryId} onChanged={refresh} />}
    />
  );
}

export { InquiryDetailPage };
