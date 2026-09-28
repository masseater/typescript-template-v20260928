import { apiData } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";

import { userClient } from "#shared/api/index.ts";
import { VisibilityView } from "#shared/contracts/index.ts";

type Visibility = typeof VisibilityView.Type;

function loadVisibility(): Promise<Visibility> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.profile.visibility.get().then((response) => apiData(VisibilityView, response)),
  );
}

function saveVisibility(values: Visibility): Promise<Visibility> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.profile.visibility.patch(values).then((response) => apiData(VisibilityView, response)),
  );
}

const visibilitySettingOptions = queryOptions({
  queryFn: loadVisibility,
  queryKey: ["visibility"],
  retry: false,
});

export { saveVisibility, visibilitySettingOptions };
export type { Visibility };
