import { InvalidSearch } from "@repo/config/paging";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Schema } from "effect";

import { AuditPage, normalizeAuditSearch } from "#pages/audit/index.ts";

const Route = createFileRoute("/_dashboard/audit")({
  component: AuditPage,
  validateSearch: (search: unknown) => {
    try {
      return normalizeAuditSearch(search);
    } catch (error) {
      if (Schema.is(InvalidSearch)(error)) {
        throw redirect({ replace: true, search: {}, to: "/audit" });
      }
      throw error;
    }
  },
});

export { Route };
