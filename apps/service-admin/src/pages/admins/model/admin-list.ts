import { useQuery, useQueryClient } from "@tanstack/react-query";

import { adminListOptions } from "#pages/admins/api/admin-list.ts";

import type { ListedAdmin } from "#pages/admins/api/admin-list.ts";
import type { FetchedValue } from "@repo/ui";

function useAdminList(): Readonly<{
  listing: FetchedValue<readonly ListedAdmin[]>;
  reload: () => void;
}> {
  const queries = useQueryClient();
  const listing = useQuery(adminListOptions);
  function reload(): void {
    void queries.invalidateQueries({ queryKey: adminListOptions.queryKey });
  }
  return { listing, reload };
}

export { useAdminList };
export type { ListedAdmin };
