import { createFileRoute } from "@tanstack/react-router";

import { memberOptions } from "#entities/member/index.ts";
import {
  ProfileFailed,
  ProfileMissing,
  ProfilePending,
  ProfileRoute,
} from "#pages/profile/index.ts";

import type { QueryClient } from "@tanstack/react-query";

const Route = createFileRoute("/_member/users/$id")({
  component: ProfileRoute,
  errorComponent: ProfileFailed,
  loader: ({
    context,
    params,
  }: Readonly<{
    context: Readonly<{ queryClient: QueryClient }>;
    params: Readonly<{ id: string }>;
  }>) => context.queryClient.query(memberOptions(params.id)),
  notFoundComponent: ProfileMissing,
  pendingComponent: ProfilePending,
});

export { Route };
