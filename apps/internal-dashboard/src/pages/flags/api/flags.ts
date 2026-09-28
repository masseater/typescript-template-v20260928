import { errorMessage } from "@repo/auth-ui";
import { apiData } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";

import { wikiClient } from "#shared/api/index.ts";
import { FlagList, FlagToggled } from "#shared/contracts/index.ts";

import type { FlagEntry } from "#shared/contracts/index.ts";

function fetchFlags(): Promise<readonly FlagEntry[]> {
  return Promise.resolve(wikiClient()).then(({ api }) =>
    api.flags.get().then((response) => apiData(FlagList, response).flags),
  );
}

const flagsOptions = queryOptions({
  queryFn: fetchFlags,
  queryKey: ["feature-flags"],
  retry: false,
});

function toggleFlag(key: FlagEntry["key"], enabled: boolean): Promise<void> {
  return Promise.resolve(wikiClient())
    .then(({ api }) => api.flags.patch({ enabled, key }))
    .then((response) => {
      apiData(FlagToggled, response);
    })
    .catch((error: unknown) => {
      throw new Error(errorMessage(error));
    });
}

export { flagsOptions, toggleFlag };
