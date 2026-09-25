import { createFileRoute } from "@tanstack/react-router";

import {
  RecoveryFailed,
  RecoveryPending,
  SettingsRecoveryPage,
  recoveryOfferOptions,
} from "#pages/recovery/index.ts";

import type { QueryClient } from "@tanstack/react-query";

const Route = createFileRoute("/_member/settings/recovery")({
  loader: ({ context }: Readonly<{ context: Readonly<{ queryClient: QueryClient }> }>) =>
    context.queryClient.query(recoveryOfferOptions),
  component: SettingsRecoveryPage,
  errorComponent: RecoveryFailed,
  pendingComponent: RecoveryPending,
});

export { Route };
