import { createFileRoute } from "@tanstack/react-router";

import { welcomePath } from "#app/entry-conditions.ts";
import { WelcomeRecoveryRoute } from "#pages/recovery/index.ts";

import type { OnboardingStep } from "#shared/contracts/index.ts";

const Route = createFileRoute("/_welcome/welcome/recovery")({
  component: WelcomeRecoveryRoute,
  loader: ({
    context,
  }: Readonly<{
    context: Readonly<{ step: Exclude<OnboardingStep, "done"> }>;
  }>) => ({ nextPath: welcomePath[context.step] }),
});

export { Route };
