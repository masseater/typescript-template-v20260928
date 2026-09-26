import { useQuery } from "@tanstack/react-query";

import { memberSummaryOptions } from "#pages/inquiries/api/inquiries.ts";
import { MemberSummaryView } from "./inquiry-detail-view.tsx";

import type { ReactElement } from "react";

function InquiryMemberSummary({ memberId }: Readonly<{ memberId: string }>): ReactElement {
  const summary = useQuery(memberSummaryOptions(memberId));
  return <MemberSummaryView failure={summary.error?.message} summary={summary.data} />;
}

export { InquiryMemberSummary };
