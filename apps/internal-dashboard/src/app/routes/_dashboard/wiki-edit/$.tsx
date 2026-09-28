import { createFileRoute } from "@tanstack/react-router";

import { WikiEditRoute, wikiEditorOptions } from "#pages/wiki-edit/index.ts";

import type { QueryClient } from "@tanstack/react-query";

const Route = createFileRoute("/_dashboard/wiki-edit/$")({
  component: WikiEditRoute,
  loader: ({
    context,
    params,
  }: Readonly<{
    context: Readonly<{ queryClient: QueryClient }>;
    params: Readonly<{ _splat?: string }>;
  }>) => context.queryClient.query(wikiEditorOptions(params._splat ?? "")),
});

export { Route };
