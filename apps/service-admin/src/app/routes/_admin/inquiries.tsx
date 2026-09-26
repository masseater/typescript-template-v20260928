import { InvalidSearch } from "@repo/config/paging";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Schema } from "effect";

import { InquiriesPage, normalizeInquiriesSearch } from "#pages/inquiries/index.ts";

const Route = createFileRoute("/_admin/inquiries")({
  component: InquiriesPage,
  validateSearch: (search: unknown) => {
    try {
      return normalizeInquiriesSearch(search);
    } catch (error) {
      if (Schema.is(InvalidSearch)(error)) {
        throw redirect({ replace: true, search: {}, to: "/inquiries" });
      }
      throw error;
    }
  },
});

export { Route };
