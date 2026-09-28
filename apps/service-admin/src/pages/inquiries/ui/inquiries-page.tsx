import { useQuery } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";

import { inquiryListOptions } from "#pages/inquiries/api/inquiries.ts";
import { inquiryListQuery } from "#pages/inquiries/model/inquiry-list.ts";
import { pendingCountOptions } from "#shared/api/index.ts";
import { InquiriesView } from "./inquiries-view.tsx";

import type { InquiryStatus } from "#pages/inquiries/model/status-label.ts";
import type { ReactElement } from "react";

const route = getRouteApi("/_admin/inquiries");

function InquiriesPage(): ReactElement {
  const search = route.useSearch();
  const navigate = useNavigate();
  const listing = useQuery(inquiryListOptions(inquiryListQuery(search)));
  const pending = useQuery(pendingCountOptions);
  function toggle(value: InquiryStatus): void {
    void navigate({
      search: search.status === value ? {} : { status: value },
      to: "/inquiries",
    });
  }
  return (
    <InquiriesView
      error={listing.error?.message ?? pending.error?.message}
      list={listing.data}
      onToggle={toggle}
      pendingCount={pending.data}
      search={search}
    />
  );
}

export { InquiriesPage };
