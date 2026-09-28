import { apiData } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";

import { InquiryMemberSummary, PendingCount } from "#shared/contracts/index.ts";
import { adminClient } from "./client.ts";

function loadPendingCount(): Promise<number> {
  return adminClient()
    .inquiries["pending-count"].get()
    .then((response) => apiData(PendingCount, response).count);
}

function loadMemberSummary(memberId: string): Promise<typeof InquiryMemberSummary.Type> {
  return adminClient()
    .inquiries.member.get({ query: { id: memberId } })
    .then((response) => apiData(InquiryMemberSummary, response));
}

const pendingCountOptions = queryOptions({
  queryFn: loadPendingCount,
  queryKey: ["admin-inquiries", "pending-count"] as const,
  retry: false,
});

const memberSummaryOptions = (memberId: string) =>
  queryOptions({
    queryFn: () => loadMemberSummary(memberId),
    queryKey: ["admin-members", memberId, "summary"] as const,
    retry: false,
  });

export { loadMemberSummary, memberSummaryOptions, pendingCountOptions };
