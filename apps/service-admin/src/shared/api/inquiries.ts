import { apiData } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";

import { PendingCount } from "#shared/contracts/index.ts";
import { adminClient } from "./client.ts";

const inquiriesKey = ["admin-inquiries"] as const;

function loadPendingCount(): Promise<number> {
  return adminClient()
    .inquiries["pending-count"].get()
    .then((response) => apiData(PendingCount, response).count);
}

const pendingCountOptions = queryOptions({
  queryFn: loadPendingCount,
  queryKey: [...inquiriesKey, "pending-count"] as const,
  retry: false,
});

export { inquiriesKey, pendingCountOptions };
