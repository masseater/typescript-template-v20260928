import { apiData } from "@repo/runtime/client";

import { adminClient } from "#shared/api/index.ts";
import {
  AdminInquiryList,
  AdminInquiryThread,
  InquiryListQuery,
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

export { closeInquiry, loadInquiry, loadInquiries, replyToInquiry };
