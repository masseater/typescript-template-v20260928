import { PLAN } from "@repo/config";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Schema } from "effect";

import { UpgradeFailed, UpgradeRoute, loadUpgrade } from "#pages/upgrade/index.ts";
import { InvalidCheckoutReturn, readCheckoutReturn } from "#shared/contracts/index.ts";

import type { Upgrade } from "#pages/upgrade/index.ts";

function requireCheckoutReturn(raw: unknown): ReturnType<typeof readCheckoutReturn> {
  try {
    return readCheckoutReturn(raw);
  } catch (error) {
    if (Schema.is(InvalidCheckoutReturn)(error)) {
      throw redirect({ replace: true, search: {}, to: "/upgrade" });
    }
    throw error;
  }
}

function loadOrLeave(): Promise<Upgrade> {
  return loadUpgrade().then((upgrade) =>
    Promise.resolve().then(() => {
      if (upgrade.plan.plan === PLAN.paid) {
        throw redirect({
          replace: true,
          search: {},
          to: "/settings/plan",
        });
      }
      return upgrade;
    }),
  );
}
const Route = createFileRoute("/_member/upgrade")({
  validateSearch: requireCheckoutReturn,
  loader: loadOrLeave,
  gcTime: 0,
  component: UpgradeRoute,
  errorComponent: UpgradeFailed,
});
export { Route };
