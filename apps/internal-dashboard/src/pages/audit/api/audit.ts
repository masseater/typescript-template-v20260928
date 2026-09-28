import { apiData } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";

import { wikiClient } from "#shared/api/index.ts";
import { StaffAuditPage, type StaffAuditPageView } from "#shared/contracts/index.ts";

import type { AuditPage } from "@repo/config/paging";

function loadAuditPage(query: typeof AuditPage.Type): Promise<StaffAuditPageView> {
  return Promise.resolve(wikiClient()).then(({ api }) =>
    api.audit.get({ query }).then((response) => apiData(StaffAuditPage, response)),
  );
}

function auditPageOptions(query: typeof AuditPage.Type) {
  return queryOptions({
    queryFn: () => loadAuditPage(query),
    queryKey: ["staff-audit", query] as const,
    retry: false,
  });
}

export { auditPageOptions };
