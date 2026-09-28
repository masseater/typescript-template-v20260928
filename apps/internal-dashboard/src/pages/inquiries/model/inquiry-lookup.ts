import { useOptionalString, useTextInput } from "@repo/ui";
import { useQuery } from "@tanstack/react-query";
import { Option } from "effect";

import {
  inquiryCountsOptions,
  inquiryOptions,
  memberInquiriesOptions,
} from "#pages/inquiries/api/inquiries.ts";

import type { InquiryLookup } from "./inquiry-lookup-state.ts";

function useInquiryLookup(): InquiryLookup {
  const memberId = useTextInput();
  const lookupId = useTextInput();
  const [lookedUpMember, setLookedUpMember] = useOptionalString();
  const [selectedInquiry, setSelectedInquiry] = useOptionalString();
  const counts = useQuery(inquiryCountsOptions);
  const memberListing = useQuery(memberInquiriesOptions(Option.getOrUndefined(lookedUpMember)));
  const selection = useQuery(inquiryOptions(Option.getOrUndefined(selectedInquiry)));

  function handleMemberLookup(event: Readonly<{ preventDefault: () => void }>): void {
    event.preventDefault();
    setSelectedInquiry(Option.none());
    setLookedUpMember(Option.some(memberId.value));
  }
  function handleInquiryLookup(event: Readonly<{ preventDefault: () => void }>): void {
    event.preventDefault();
    setSelectedInquiry(Option.some(lookupId.value));
  }
  function showInquiry(inquiryId: string): void {
    setSelectedInquiry(Option.some(inquiryId));
  }

  return {
    counts: counts.data,
    error: counts.error?.message ?? memberListing.error?.message ?? selection.error?.message,
    handleInquiryLookup,
    handleLookupIdChange: lookupId.handleChange,
    handleMemberIdChange: memberId.handleChange,
    handleMemberLookup,
    lookupId: lookupId.value,
    memberId: memberId.value,
    memberInquiries: memberListing.data?.inquiries,
    selected: selection.data,
    showInquiry,
  };
}

export { useInquiryLookup };
