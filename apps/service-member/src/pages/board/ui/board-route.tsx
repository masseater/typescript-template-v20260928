import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { threadsOptions } from "#pages/board/api/board.ts";
import { BoardPage } from "./board-page.tsx";

import type { ReactElement } from "react";

const route = getRouteApi("/_member/board/");

function BoardRoute(): ReactElement {
  const search = route.useSearch();
  const { data: list } = useSuspenseQuery(threadsOptions(search.page ?? 1));
  return <BoardPage list={list} search={search} />;
}

export { BoardRoute };
