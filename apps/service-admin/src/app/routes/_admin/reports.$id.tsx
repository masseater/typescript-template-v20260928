import { createFileRoute } from "@tanstack/react-router";

import { ReportRoute, reportOptions } from "#pages/reports/index.ts";

const Route = createFileRoute("/_admin/reports/$id")({
  component: ReportRoute,
  loader: ({ context, params }) => context.queryClient.query(reportOptions(params.id)),
});

export { Route };
