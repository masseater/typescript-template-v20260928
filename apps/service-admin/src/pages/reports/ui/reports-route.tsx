import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { reportsOptions } from "#pages/reports/api/load-reports.ts";
import { ReportsPage } from "./reports-page.tsx";

import type { ReactElement } from "react";

const route = getRouteApi("/_admin/reports");

function ReportsRoute(): ReactElement {
  const search = route.useSearch();
  const deps = route.useLoaderDeps();
  const { data } = useSuspenseQuery(reportsOptions(deps));
  return <ReportsPage reports={data.reports} status={search.status} />;
}

export { ReportsRoute };
