import { IdentifierQuery } from "@repo/runtime/contracts";
import { httpStatus } from "@repo/config";
import { inquiryStaff } from "@repo/db/inquiry-staff";
import { sessionFailures } from "@repo/runtime/account";
import { createApi, readSearchParams } from "@repo/runtime/http";
import { Effect } from "effect";

import { StaffInquiryCounts, StaffInquiryList, StaffInquiryThread } from "#shared/contracts/index.ts";

import type { WikiServices } from "#shared/wiki/index.ts";
import type { ApiRoutes } from "@repo/runtime/http";

const failures = {
  ...sessionFailures,
  InquiryNotFound: { message: "問い合わせが見つかりません。", status: httpStatus.notFound },
};

function inquiryApi(api: ApiRoutes<WikiServices>) {
  return createApi("")
    .get(
      "/inquiries/counts",
      ...api.route({ response: StaffInquiryCounts }, () => inquiryStaff.inquiryCounts(), failures),
    )
    .get(
      "/inquiries/member",
      ...api.route(
        { response: StaffInquiryList },
        (request) =>
          Effect.gen(function* handle() {
            const { id } = yield* readSearchParams(IdentifierQuery, request);
            const inquiries = yield* inquiryStaff.listMemberInquiries(id);
            return { inquiries };
          }),
        failures,
      ),
    )
    .get(
      "/inquiries/detail",
      ...api.route(
        { response: StaffInquiryThread },
        (request) =>
          Effect.gen(function* handle() {
            const { id } = yield* readSearchParams(IdentifierQuery, request);
            return yield* inquiryStaff.getInquiry(id);
          }),
        failures,
      ),
    );
}

export { inquiryApi };
