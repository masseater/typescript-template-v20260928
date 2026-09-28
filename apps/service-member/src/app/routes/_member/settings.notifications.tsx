import { createFileRoute } from "@tanstack/react-router";

import {
  SettingsNotificationsRoute,
  notificationPreferencesOptions,
} from "#pages/settings/index.ts";

import type { QueryClient } from "@tanstack/react-query";

const Route = createFileRoute("/_member/settings/notifications")({
  component: SettingsNotificationsRoute,
  loader: ({ context }: Readonly<{ context: Readonly<{ queryClient: QueryClient }> }>) =>
    context.queryClient.query(notificationPreferencesOptions),
});

export { Route };
