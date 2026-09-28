import { createFileRoute, redirect } from "@tanstack/react-router";
import { Schema } from "effect";

import { PlanRoute, loadPlan } from "#pages/settings/index.ts";
import { InvalidCheckoutReturn, readCheckoutReturn } from "#shared/contracts/index.ts";

function requireCheckoutReturn(raw: unknown): ReturnType<typeof readCheckoutReturn> {
  try {
    return readCheckoutReturn(raw);
  } catch (error) {
    if (Schema.is(InvalidCheckoutReturn)(error)) {
      throw redirect({ replace: true, search: {}, to: "/settings/plan" });
    }
    throw error;
  }
}

const Route = createFileRoute("/_member/settings/plan")({
  validateSearch: requireCheckoutReturn,
  loader: loadPlan,
  gcTime: 0,
  component: PlanRoute,
});

export { Route };
