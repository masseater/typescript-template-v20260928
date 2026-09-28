import { createFileRoute, defaultStringifySearch, redirect } from "@tanstack/react-router";
import { Schema } from "effect";

import {
  InvalidBoardSearch,
  ThreadFailed,
  ThreadMissing,
  ThreadPending,
  ThreadRoute,
  normalizeThreadSearch,
  threadOptions,
} from "#pages/board/index.ts";

import type { ThreadSearch } from "#pages/board/index.ts";
import type { QueryClient } from "@tanstack/react-query";

function requireThreadSearch(raw: unknown): ThreadSearch {
  try {
    return normalizeThreadSearch(raw);
  } catch (error) {
    if (Schema.is(InvalidBoardSearch)(error)) {
      throw redirect({ replace: true, search: {}, to: "/board" });
    }
    throw error;
  }
}

const Route = createFileRoute("/_member/board/$id")({
  validateSearch: requireThreadSearch,
  loaderDeps: ({ search }: Readonly<{ search: ThreadSearch }>) => ({ page: search.page ?? 1 }),
  beforeLoad: ({
    location,
    params,
    search,
  }: Readonly<{
    location: Readonly<{ searchStr: string }>;
    params: Readonly<{ id: string }>;
    search: ThreadSearch;
  }>) => {
    if (location.searchStr !== defaultStringifySearch(search)) {
      throw redirect({ params, replace: true, search, to: "/board/$id" });
    }
  },
  loader: ({
    context,
    deps,
    params,
  }: Readonly<{
    context: Readonly<{ queryClient: QueryClient }>;
    deps: Readonly<{ page: number }>;
    params: Readonly<{ id: string }>;
  }>) => context.queryClient.query(threadOptions(params.id, deps.page)),
  component: ThreadRoute,
  errorComponent: ThreadFailed,
  notFoundComponent: ThreadMissing,
  pendingComponent: ThreadPending,
});

export { Route };
