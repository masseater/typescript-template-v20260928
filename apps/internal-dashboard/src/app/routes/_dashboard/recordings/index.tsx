import { createFileRoute } from "@tanstack/react-router";

import { RecordingsRoute, peopleOptions, recordingsOptions } from "#pages/recordings/index.ts";

import type { QueryClient } from "@tanstack/react-query";

const Route = createFileRoute("/_dashboard/recordings/")({
  component: RecordingsRoute,
  loader: ({ context }: Readonly<{ context: Readonly<{ queryClient: QueryClient }> }>) =>
    Promise.all([
      context.queryClient.query(recordingsOptions),
      context.queryClient.query(peopleOptions),
    ]),
});

export { Route };
