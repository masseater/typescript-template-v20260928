import { apiData } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";

import { adminClient, inquiriesKey } from "#shared/api/index.ts";
import {
  AdminInquiryList,
  AdminInquiryThread,
  InquiryListQuery,
  InquiryMemberSummary,
  InquiryReply,
} from "#shared/contracts/index.ts";

function loadInquiries(query: typeof InquiryListQuery.Type): Promise<typeof AdminInquiryList.Type> {
  return adminClient()
    .inquiries.get({ query })
    .then((response) => apiData(AdminInquiryList, response));
}

function loadInquiry(id: string): Promise<typeof AdminInquiryThread.Type> {
  return adminClient()
    .inquiries.detail.get({ query: { id } })
    .then((response) => apiData(AdminInquiryThread, response));
}

function loadMemberSummary(memberId: string): Promise<typeof InquiryMemberSummary.Type> {
  return adminClient()
    .inquiries.member.get({ query: { id: memberId } })
    .then((response) => apiData(InquiryMemberSummary, response));
}

function replyToInquiry(values: typeof InquiryReply.Type): Promise<typeof AdminInquiryThread.Type> {
  return adminClient()
    .inquiries.reply.post(values)
    .then((response) => apiData(AdminInquiryThread, response));
}

function closeInquiry(id: string): Promise<typeof AdminInquiryThread.Type> {
  return adminClient()
    .inquiries.close.post({ id })
    .then((response) => apiData(AdminInquiryThread, response));
}

function inquiryListOptions(query: typeof InquiryListQuery.Type) {
  return queryOptions({
    queryFn: () => loadInquiries(query),
    queryKey: [...inquiriesKey, "list", query] as const,
    retry: false,
  });
}

function inquiryThreadOptions(id: string) {
  return queryOptions({
    queryFn: () => loadInquiry(id),
    queryKey: [...inquiriesKey, "thread", id] as const,
    retry: false,
  });
}

function memberSummaryOptions(memberId: string) {
  return queryOptions({
    queryFn: () => loadMemberSummary(memberId),
    queryKey: ["admin-inquiry-member", memberId] as const,
    retry: false,
  });
}

export {
  closeInquiry,
  inquiryListOptions,
  inquiryThreadOptions,
  memberSummaryOptions,
  replyToInquiry,
};
