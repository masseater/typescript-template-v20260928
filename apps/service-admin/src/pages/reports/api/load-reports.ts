import { apiData } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";

import { adminClient } from "#shared/api/index.ts";
import { ReportDetail, ReportList, ReportListQuery } from "#shared/contracts/index.ts";

import type { ReportStatus } from "@repo/config";

type ReportSummary = (typeof ReportList.Type)["reports"][number];
type ReportItem = typeof ReportDetail.Type;

function loadReports(page: {
  readonly page: number;
  readonly status?: ReportStatus;
}): Promise<typeof ReportList.Type> {
  return adminClient()
    .reports.get({
      query: {
        page: page.page,
        ...(page.status === undefined ? {} : { status: page.status }),
      } satisfies typeof ReportListQuery.Type,
    })
    .then((response) => apiData(ReportList, response));
}

function loadReport(id: string): Promise<ReportItem> {
  return adminClient()
    .reports.detail.get({ query: { id } })
    .then((response) => apiData(ReportDetail, response));
}

const reportsKey = ["admin-reports"] as const;

type ReportsQuery = Readonly<{ page: number; status?: ReportStatus }>;

function reportsOptions(query: ReportsQuery) {
  return queryOptions({
    queryFn: () => loadReports(query),
    queryKey: [...reportsKey, "list", query.page, query.status ?? "all"],
  });
}

function reportOptions(id: string) {
  return queryOptions({
    queryFn: () => loadReport(id),
    queryKey: [...reportsKey, "detail", id],
  });
}

export { reportOptions, reportsKey, reportsOptions };
export type { ReportItem, ReportSummary, ReportsQuery };
