import { inquiryStatuses } from "@repo/config";
import { adminPageSize, laterPage, searchNormalizer } from "@repo/config/paging";
import { Schema } from "effect";

import type { InquiryListQuery } from "#shared/contracts/index.ts";

const maximumInquiriesPage = Math.floor(Number.MAX_SAFE_INTEGER / adminPageSize);

const InquiriesSearchParams = Schema.Struct({
  page: Schema.optionalKey(laterPage(maximumInquiriesPage)),
  status: Schema.optionalKey(Schema.Literals(inquiryStatuses)),
});

type InquiriesSearch = typeof InquiriesSearchParams.Type;

const normalizeInquiriesSearch = searchNormalizer(InquiriesSearchParams);

function inquiryListQuery(search: InquiriesSearch): typeof InquiryListQuery.Type {
  const query = { limit: adminPageSize, offset: ((search.page ?? 1) - 1) * adminPageSize };
  return search.status === undefined ? query : { ...query, status: search.status };
}

export { inquiryListQuery, normalizeInquiriesSearch };
export type { InquiriesSearch };
