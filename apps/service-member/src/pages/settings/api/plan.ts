import { apiData } from "@repo/runtime/client";

import { userClient } from "#shared/api/index.ts";
import { HostedPage } from "#shared/contracts/index.ts";

function openPortal(): Promise<void> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.billing.portal.post({}).then((response) => {
      globalThis.location.assign(apiData(HostedPage, response).url);
    }),
  );
}

export { openPortal };
