import { useQuery, useQueryClient } from "@tanstack/react-query";

import { flagsOptions } from "#pages/flags/api/flags.ts";
import { FlagsView } from "./flags-view.tsx";

import type { ReactElement } from "react";

function FlagsPage(): ReactElement {
  const queries = useQueryClient();
  const listing = useQuery(flagsOptions);
  function reload(): Promise<void> {
    return queries.invalidateQueries({ queryKey: flagsOptions.queryKey });
  }
  return (
    <FlagsView
      failure={listing.error?.message}
      flags={listing.data}
      onReload={() => {
        void reload();
      }}
      onToggled={reload}
    />
  );
}

export { FlagsPage };
