import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { conversationsOptions } from "#pages/messages/api/messages.ts";
import { MessagesPage } from "./messages-page.tsx";

import type { ReactElement } from "react";

const route = getRouteApi("/_member/messages/");

function MessagesRoute(): ReactElement {
  const search = route.useSearch();
  const { data: list } = useSuspenseQuery(conversationsOptions(search.page ?? 1));
  return <MessagesPage list={list} search={search} />;
}

export { MessagesRoute };
