import { useSuspenseQuery } from "@tanstack/react-query";

import { profileOptions } from "#entities/profile/index.ts";
import { ProfileEditPage } from "./profile-edit-page.tsx";

import type { ReactElement } from "react";

function ProfileEditRoute(): ReactElement {
  const { data } = useSuspenseQuery(profileOptions);
  return <ProfileEditPage initial={data} />;
}

export { ProfileEditRoute };
