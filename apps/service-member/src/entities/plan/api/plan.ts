import { apiData } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";

import { userClient } from "#shared/api/index.ts";
import { PlanView } from "#shared/contracts/index.ts";

type Plan = typeof PlanView.Type;

function loadPlan(): Promise<Plan> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.billing.plan.get().then((response) => apiData(PlanView, response)),
  );
}

const planOptions = queryOptions({
  queryFn: loadPlan,
  queryKey: ["plan"],
  retry: false,
});

export { planOptions };
export type { Plan };
