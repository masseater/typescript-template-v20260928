import { PLAN } from "@repo/config";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { planOptions } from "#entities/plan/index.ts";
import { UpgradeFailed, UpgradeRoute, offerOptions } from "#pages/upgrade/index.ts";
import { readCheckoutReturn } from "#shared/contracts/index.ts";

import type { QueryClient } from "@tanstack/react-query";

function loadOrLeave(queries: QueryClient): Promise<void> {
  return Promise.all([queries.query(planOptions), queries.query(offerOptions)]).then(([plan]) => {
    if (plan.plan === PLAN.paid) {
      throw redirect({
        replace: true,
        search: {},
        to: "/settings/plan",
      });
    }
  });
}
const Route = createFileRoute("/_member/upgrade")({
  validateSearch: readCheckoutReturn,
  loader: ({ context }: Readonly<{ context: Readonly<{ queryClient: QueryClient }> }>) =>
    loadOrLeave(context.queryClient),
  component: UpgradeRoute,
  errorComponent: UpgradeFailed,
});
export { Route };
