import { createFileRoute } from "@tanstack/react-router";

import { planOptions } from "#entities/plan/index.ts";
import { PlanRoute } from "#pages/settings/index.ts";
import { readCheckoutReturn } from "#shared/contracts/index.ts";

import type { QueryClient } from "@tanstack/react-query";

const Route = createFileRoute("/_member/settings/plan")({
  validateSearch: readCheckoutReturn,
  loader: ({ context }: Readonly<{ context: Readonly<{ queryClient: QueryClient }> }>) =>
    context.queryClient.query(planOptions),
  component: PlanRoute,
});

export { Route };
