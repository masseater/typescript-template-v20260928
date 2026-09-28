import { adminPageSize, laterPage, maximumAdminPage, searchNormalizer } from "@repo/config/paging";
import { Schema } from "effect";

import { AuditAction } from "./audit-filter.ts";

import type { AuditPage } from "@repo/config/paging";
import type { AuditFilter } from "./audit-filter.ts";

const FilterText = Schema.String.check(Schema.isNonEmpty());

const AuditSearchParams = Schema.Struct({
  action: Schema.optionalKey(AuditAction),
  actorId: Schema.optionalKey(FilterText),
  page: Schema.optionalKey(laterPage(maximumAdminPage)),
  targetId: Schema.optionalKey(FilterText),
});

type AuditSearch = typeof AuditSearchParams.Type;

const normalizeAuditSearch = searchNormalizer(AuditSearchParams);

function auditPageQuery(search: AuditSearch): typeof AuditPage.Type {
  return {
    ...(search.action === undefined ? {} : { action: search.action }),
    ...(search.actorId === undefined ? {} : { actorId: search.actorId }),
    limit: adminPageSize,
    offset: ((search.page ?? 1) - 1) * adminPageSize,
    ...(search.targetId === undefined ? {} : { targetId: search.targetId }),
  };
}

function filterOf(search: AuditSearch): AuditFilter {
  return {
    action: search.action,
    actorId: search.actorId ?? "",
    targetId: search.targetId ?? "",
  };
}

function searchOf(filter: AuditFilter): AuditSearch {
  const actorId = filter.actorId.trim();
  const targetId = filter.targetId.trim();
  return {
    ...(filter.action === undefined ? {} : { action: filter.action }),
    ...(actorId === "" ? {} : { actorId }),
    ...(targetId === "" ? {} : { targetId }),
  };
}

export { auditPageQuery, filterOf, normalizeAuditSearch, searchOf };
export type { AuditSearch };
