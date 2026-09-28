import { createFileRoute } from "@tanstack/react-router";

import { VisibilityRoute, visibilitySettingOptions } from "#pages/settings/index.ts";

import type { QueryClient } from "@tanstack/react-query";

const Route = createFileRoute("/_member/settings/visibility")({
  component: VisibilityRoute,
  loader: ({ context }: Readonly<{ context: Readonly<{ queryClient: QueryClient }> }>) =>
    context.queryClient.query(visibilitySettingOptions),
});

export { Route };
