import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { reportOptions } from "#pages/reports/api/load-reports.ts";
import { ReportPage } from "./report-page.tsx";

import type { ReactElement } from "react";

const route = getRouteApi("/_admin/reports/$id");

function ReportRoute(): ReactElement {
  const { id } = route.useParams();
  const { data } = useSuspenseQuery(reportOptions(id));
  return <ReportPage report={data} />;
}

export { ReportRoute };
