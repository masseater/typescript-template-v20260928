import { useSuspenseQuery } from "@tanstack/react-query";

import { visibilitySettingOptions } from "#pages/settings/api/visibility.ts";
import { VisibilityPage } from "./visibility-page.tsx";

import type { ReactElement } from "react";

function VisibilityRoute(): ReactElement {
  const { data: visibility } = useSuspenseQuery(visibilitySettingOptions);
  return <VisibilityPage initial={visibility} />;
}

export { VisibilityRoute };
