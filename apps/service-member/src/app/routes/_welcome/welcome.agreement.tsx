import { createFileRoute } from "@tanstack/react-router";

import { agreementsOptions } from "#entities/agreement/index.ts";
import { WelcomeAgreementRoute } from "#pages/account/welcome/index.ts";

const Route = createFileRoute("/_welcome/welcome/agreement")({
  component: WelcomeAgreementRoute,
  loader: ({ context }) => context.queryClient.query(agreementsOptions),
});

export { Route };
