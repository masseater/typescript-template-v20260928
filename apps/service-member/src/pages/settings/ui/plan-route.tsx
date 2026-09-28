import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { planOptions } from "#entities/plan/index.ts";
import { CHECKOUT_RETURN } from "#shared/contracts/index.ts";
import { PlanPage } from "./plan-page.tsx";

import type { ReactElement } from "react";

const route = getRouteApi("/_member/settings/plan");

function PlanRoute(): ReactElement {
  const { checkout } = route.useSearch();
  const { data: plan } = useSuspenseQuery(planOptions);
  return <PlanPage awaitingCheckout={checkout === CHECKOUT_RETURN.success} plan={plan} />;
}

export { PlanRoute };
