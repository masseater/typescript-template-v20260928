import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { groupOptions } from "#pages/groups/api/groups.ts";
import { GroupPage } from "./group-page.tsx";

import type { ReactElement } from "react";

const route = getRouteApi("/_member/groups/$id");

function GroupRoute(): ReactElement {
  const { id } = route.useParams();
  const search = route.useSearch();
  const { data: group } = useSuspenseQuery(groupOptions(id, search.invite));
  return <GroupPage group={group} search={search} />;
}

export { GroupRoute };
