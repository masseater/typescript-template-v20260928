import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { conversationOptions } from "#pages/messages/api/messages.ts";
import { ConversationPage } from "./conversation-page.tsx";

import type { ReactElement } from "react";

const route = getRouteApi("/_member/messages/$id");

function ConversationRoute(): ReactElement {
  const { id } = route.useParams();
  const search = route.useSearch();
  const { data: thread } = useSuspenseQuery(conversationOptions(id, search.page ?? 1));
  return <ConversationPage thread={thread} search={search} />;
}

export { ConversationRoute };
