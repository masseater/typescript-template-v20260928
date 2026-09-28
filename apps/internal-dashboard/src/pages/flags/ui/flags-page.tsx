import { useQuery, useQueryClient } from "@tanstack/react-query";

import { flagsOptions, toggleFlag } from "#pages/flags/api/flags.ts";
import { FlagsView } from "./flags-view.tsx";

import type { ReactElement } from "react";

function FlagsPage(): ReactElement {
  const queries = useQueryClient();
  const listing = useQuery(flagsOptions);
  function reload(): Promise<void> {
    return queries.invalidateQueries({ queryKey: flagsOptions.queryKey });
  }
  function refresh(): void {
    void queries.invalidateQueries({ queryKey: flagsOptions.queryKey });
  }
  return (
    <FlagsView
      failure={listing.error?.message}
      flags={listing.data}
      onReload={refresh}
      onToggle={(key, enabled) => toggleFlag(key, enabled).then(reload)}
    />
  );
}

export { FlagsPage };
