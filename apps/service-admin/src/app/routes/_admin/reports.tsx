import { reportStatuses } from "@repo/config";
import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { ReportsRoute, reportsOptions } from "#pages/reports/index.ts";

import type { ReportsQuery } from "#pages/reports/index.ts";
import type { ReportStatus } from "@repo/config";

const searchSchema = Schema.toStandardSchemaV1(
  Schema.Struct({
    page: Schema.optionalKey(Schema.FiniteFromString),
    status: Schema.optionalKey(Schema.Literals(reportStatuses)),
  }),
);

type ReportsSearch = Readonly<{
  page?: number | undefined;
  status?: ReportStatus | undefined;
}>;

const Route = createFileRoute("/_admin/reports")({
  component: ReportsRoute,
  validateSearch: searchSchema,
  loaderDeps: ({ search }: Readonly<{ search: ReportsSearch }>): ReportsQuery => ({
    page: search.page ?? 1,
    ...(search.status === undefined ? {} : { status: search.status }),
  }),
  loader: ({ context, deps }) => context.queryClient.query(reportsOptions(deps)),
});

export { Route };
