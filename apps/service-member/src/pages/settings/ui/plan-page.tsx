import { useAction } from "@repo/ui";
import { useQueryClient } from "@tanstack/react-query";

import { planOptions } from "#entities/plan/index.ts";
import { openPortal } from "#pages/settings/api/plan.ts";
import { summarizePlan } from "#pages/settings/model/plan-summary.ts";
import { PlanView } from "./plan-view.tsx";

import type { Plan } from "#entities/plan/index.ts";
import type { ReactElement } from "react";

function PlanPage({
  awaitingCheckout,
  plan,
}: Readonly<{ awaitingCheckout: boolean; plan: Plan }>): ReactElement {
  const queries = useQueryClient();
  const action = useAction();
  const summary = summarizePlan(plan);
  function manage(): void {
    action.run(openPortal);
  }
  function reload(): void {
    void queries.invalidateQueries({ queryKey: planOptions.queryKey });
  }
  return (
    <PlanView
      action={action}
      checkoutPending={awaitingCheckout && summary.upgradable}
      onManage={manage}
      onReload={reload}
      summary={summary}
    />
  );
}

export { PlanPage };
