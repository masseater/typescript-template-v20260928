import { firstResultError, resultValue } from "@repo/ui";
import { useQuery } from "@tanstack/react-query";

import { useInquiryList, useInquiryStatusFilter } from "#pages/inquiries/model/inquiry-list.ts";
import { pendingCountOptions } from "#shared/api/index.ts";
import { InquiriesView } from "./inquiries-view.tsx";

import type { ReactElement } from "react";

function InquiriesPage(): ReactElement {
  const { status, toggle } = useInquiryStatusFilter();
  const listing = useInquiryList(status);
  const pending = useQuery(pendingCountOptions);
  return (
    <InquiriesView
      error={firstResultError(listing) ?? pending.error?.message}
      inquiries={resultValue(listing)}
      onToggle={toggle}
      pendingCount={pending.data}
      status={status}
    />
  );
}

export { InquiriesPage };
