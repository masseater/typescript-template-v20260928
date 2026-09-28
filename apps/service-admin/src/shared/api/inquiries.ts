import { Tally } from "@repo/runtime/contracts";
import { apiData } from "@repo/runtime/client";
import { requestAtom } from "@repo/ui";

import { adminClient } from "./client.ts";

function loadPendingCount(): Promise<number> {
  return adminClient()
    .inquiries["pending-count"].get()
    .then((response) => apiData(Tally, response).count);
}

const pendingCountAtom = requestAtom(loadPendingCount);

export { pendingCountAtom };
