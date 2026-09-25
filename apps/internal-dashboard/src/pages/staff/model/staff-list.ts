import { useQuery, useQueryClient } from "@tanstack/react-query";

import { staffListOptions } from "#pages/staff/api/staff.ts";

import type { ListedStaff } from "#pages/staff/api/staff.ts";
import type { FetchedValue } from "@repo/ui";

function useStaffList(): Readonly<{
  listing: FetchedValue<readonly ListedStaff[]>;
  reload: () => void;
}> {
  const queries = useQueryClient();
  const listing = useQuery(staffListOptions);
  function reload(): void {
    void queries.invalidateQueries({ queryKey: staffListOptions.queryKey });
  }
  return { listing, reload };
}

export { useStaffList };
export type { ListedStaff };
