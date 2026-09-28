import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { threadOptions } from "#pages/board/api/board.ts";
import { ThreadPage } from "./thread-page.tsx";

import type { ReactElement } from "react";

const route = getRouteApi("/_member/board/$id");

function ThreadRoute(): ReactElement {
  const { id } = route.useParams();
  const search = route.useSearch();
  const { data: thread } = useSuspenseQuery(threadOptions(id, search.page ?? 1));
  return <ThreadPage thread={thread} search={search} />;
}

export { ThreadRoute };
