import { apiData } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";

import { wikiClient } from "#shared/api/index.ts";
import { StaffOverview } from "#shared/contracts/index.ts";

function loadOverview(): Promise<typeof StaffOverview.Type> {
  return Promise.resolve(wikiClient()).then(({ api }) =>
    api.overview.get().then((response) => apiData(StaffOverview, response)),
  );
}

const overviewOptions = queryOptions({
  queryFn: loadOverview,
  queryKey: ["staff-overview"],
  retry: false,
});

export { overviewOptions };
