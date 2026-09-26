import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { auditPageOptions } from "#pages/audit/api/audit.ts";
import { useAuditFilter } from "#pages/audit/model/audit-list.ts";
import { auditPageQuery } from "#pages/audit/model/audit-search.ts";
import { AuditView } from "./audit-view.tsx";

import type { ReactElement } from "react";

const route = getRouteApi("/_dashboard/audit");

function AuditPage(): ReactElement {
  const search = route.useSearch();
  const audit = useAuditFilter(search);
  const listing = useQuery(auditPageOptions(auditPageQuery(search)));
  return (
    <AuditView audit={audit} error={listing.error?.message} page={listing.data} search={search} />
  );
}

export { AuditPage };
