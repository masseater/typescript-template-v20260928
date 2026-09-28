import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { memberOptions } from "#entities/member/index.ts";
import { ProfilePage } from "./profile-page.tsx";

import type { ReactElement } from "react";

const route = getRouteApi("/_member/users/$id");

function ProfileRoute(): ReactElement {
  const { id } = route.useParams();
  const { data: member } = useSuspenseQuery(memberOptions(id));
  const { session } = route.useRouteContext();
  return <ProfilePage member={member} own={member.id === session.user.id} />;
}

export { ProfileRoute };
