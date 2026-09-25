import { useQuery } from "@tanstack/react-query";

import { overviewOptions } from "#pages/overview/api/overview.ts";
import { OverviewView } from "./overview-view.tsx";

import type { ReactElement } from "react";

function OverviewPage(): ReactElement {
  const overview = useQuery(overviewOptions);
  return <OverviewView error={overview.error?.message} overview={overview.data} />;
}

export { OverviewPage };
