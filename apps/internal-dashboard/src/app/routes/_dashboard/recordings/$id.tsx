import { createFileRoute } from "@tanstack/react-router";

import { RecordingRoute, peopleOptions, recordingOptions } from "#pages/recordings/index.ts";

import type { QueryClient } from "@tanstack/react-query";

const Route = createFileRoute("/_dashboard/recordings/$id")({
  component: RecordingRoute,
  loader: ({
    context,
    params,
  }: Readonly<{
    context: Readonly<{ queryClient: QueryClient }>;
    params: Readonly<{ id: string }>;
  }>) =>
    Promise.all([
      context.queryClient.query(recordingOptions(params.id)),
      context.queryClient.query(peopleOptions),
    ]),
});

export { Route };
