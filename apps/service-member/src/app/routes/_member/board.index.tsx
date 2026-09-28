import { createFileRoute, defaultStringifySearch, redirect } from "@tanstack/react-router";
import { Schema } from "effect";

import {
  BoardFailed,
  BoardPending,
  BoardRoute,
  InvalidBoardSearch,
  normalizeBoardSearch,
  threadsOptions,
} from "#pages/board/index.ts";

import type { BoardSearch } from "#pages/board/index.ts";
import type { QueryClient } from "@tanstack/react-query";

function requireBoardSearch(raw: unknown): BoardSearch {
  try {
    return normalizeBoardSearch(raw);
  } catch (error) {
    if (Schema.is(InvalidBoardSearch)(error)) {
      throw redirect({ replace: true, search: {}, to: "/board" });
    }
    throw error;
  }
}

const Route = createFileRoute("/_member/board/")({
  validateSearch: requireBoardSearch,
  loaderDeps: ({ search }: Readonly<{ search: BoardSearch }>) => ({ page: search.page ?? 1 }),
  beforeLoad: ({
    location,
    search,
  }: Readonly<{
    location: Readonly<{ searchStr: string }>;
    search: BoardSearch;
  }>) => {
    if (location.searchStr !== defaultStringifySearch(search)) {
      throw redirect({ replace: true, search, to: "/board" });
    }
  },
  loader: ({
    context,
    deps,
  }: Readonly<{
    context: Readonly<{ queryClient: QueryClient }>;
    deps: Readonly<{ page: number }>;
  }>) => context.queryClient.query(threadsOptions(deps.page)),
  component: BoardRoute,
  errorComponent: BoardFailed,
  pendingComponent: BoardPending,
});

export { Route };
