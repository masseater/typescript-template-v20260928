import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { memberOptions } from "#entities/member/index.ts";
import { ComposePage } from "./compose-page.tsx";

import type { ReactElement } from "react";

const route = getRouteApi("/_member/messages/new");

function ComposeRoute(): ReactElement {
  const { peer } = route.useSearch();
  const { data: member } = useSuspenseQuery(memberOptions(peer));
  return <ComposePage peerId={member.id} peerName={member.name} />;
}

export { ComposeRoute };
