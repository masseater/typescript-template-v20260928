import { Button, Page, localState } from "@repo/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { inquiryListOptions, supportInquiriesKey } from "#pages/support/api/support.ts";
import { InquiryListing } from "./inquiry-listing.tsx";
import { NewInquiryForm } from "./new-inquiry-form.tsx";

import type { ReactElement } from "react";

const useCreating = localState(false);

function SupportListPage(): ReactElement {
  const listing = useQuery(inquiryListOptions);
  const queries = useQueryClient();
  const [creating, setCreating] = useCreating();
  const navigate = useNavigate();

  function openForm(): void {
    setCreating(true);
  }
  function closeForm(): void {
    setCreating(false);
  }
  function showCreated(inquiryId: string): void {
    void queries.invalidateQueries({ queryKey: supportInquiriesKey });
    void navigate({ params: { id: inquiryId }, to: "/support/$id" });
  }

  if (creating) {
    return (
      <Page title="お問い合わせ">
        <NewInquiryForm onCancel={closeForm} onCreated={showCreated} />
      </Page>
    );
  }

  return (
    <Page title="お問い合わせ">
      <Button aria-label="新しい問い合わせ" onClick={openForm} type="button">
        新しい問い合わせ
      </Button>
      <InquiryListing error={listing.error?.message} inquiries={listing.data?.inquiries} />
    </Page>
  );
}

export { SupportListPage };
