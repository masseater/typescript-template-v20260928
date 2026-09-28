import { createFileRoute } from "@tanstack/react-router";

import { NotificationsRoute, notificationsOptions } from "#pages/notifications/index.ts";

import type { QueryClient } from "@tanstack/react-query";

const Route = createFileRoute("/_member/notifications")({
  component: NotificationsRoute,
  loader: ({ context }: Readonly<{ context: Readonly<{ queryClient: QueryClient }> }>) =>
    context.queryClient.query(notificationsOptions),
});

export { Route };
