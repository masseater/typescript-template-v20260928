import { createFileRoute, redirect } from "@tanstack/react-router";

import { welcomePath } from "#app/entry-conditions.ts";

import type { OnboardingStep } from "#shared/contracts/index.ts";

const Route = createFileRoute("/_welcome/welcome/")({
  beforeLoad: ({
    context,
  }: Readonly<{ context: Readonly<{ step: Exclude<OnboardingStep, "done"> }> }>) => {
    throw redirect({ to: welcomePath[context.step] });
  },
});

export { Route };
