import { localState } from "@repo/ui";
import { useQuery } from "@tanstack/react-query";
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
} from "fumadocs-ui/components/dialog/search";
import { useDeferredValue } from "react";

import { wikiSearchOptions } from "#shared/api/index.ts";
import { WikiSearchNotices } from "./wiki-search-notices.tsx";

import type { WikiSearch } from "#shared/api/index.ts";
import type { SharedProps } from "fumadocs-ui/components/dialog/search";
import type { ReactElement } from "react";

const foundItems = (found: WikiSearch | undefined): WikiSearch["results"] | null =>
  found?.results ?? null;
const useSearchText = localState("");

function WikiSearchDialog({ onOpenChange, open }: SharedProps): ReactElement {
  const [search, setSearch] = useSearchText();
  const deferred = useDeferredValue(search);
  const result = useQuery(wikiSearchOptions(deferred));
  return (
    <SearchDialog
      isLoading={result.isLoading || search !== deferred}
      onOpenChange={onOpenChange}
      onSearchChange={setSearch}
      open={open}
      search={search}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={foundItems(result.data)} />
      </SearchDialogContent>
      <SearchDialogFooter>
        <WikiSearchNotices failed={result.isError} found={result.data} />
      </SearchDialogFooter>
    </SearchDialog>
  );
}

export { WikiSearchDialog };
