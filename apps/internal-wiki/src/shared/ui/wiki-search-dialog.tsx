import { WIKI_SEARCH_MODE, WikiSearchHits, wikiBasePath } from "@repo/config";
import { localState } from "@repo/ui";
import { Effect, Option } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/unstable/http";
import { useDocsSearch } from "fumadocs-core/search/client";
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

import type { WikiSearchMode } from "@repo/config";
import type { SharedProps } from "fumadocs-ui/components/dialog/search";
import type { ReactElement } from "react";

const searchApi = `${wikiBasePath}/api/search`;
const keywordOnlyNotice = "意味検索が使えないため、キーワード検索のみです。";
const useSearchMode = localState(Option.none<WikiSearchMode>());

function searchClient(onMode: (mode: WikiSearchMode | undefined) => void) {
  return {
    deps: [searchApi],
    search(query: string) {
      return Effect.runPromise(
        Effect.gen(function* wikiSearch() {
          const url = new URL(searchApi, globalThis.location.origin);
          url.searchParams.set("query", query);
          const response = yield* HttpClient.get(url.href).pipe(
            Effect.flatMap(HttpClientResponse.filterStatusOk),
            Effect.provide(FetchHttpClient.layer),
            Effect.orDie,
          );
          const body = yield* HttpClientResponse.schemaBodyJson(WikiSearchHits)(response).pipe(
            Effect.orDie,
          );
          onMode(body.mode);
          return [...body.results];
        }),
      );
    },
  };
}

function WikiSearchDialog({ onOpenChange, open }: SharedProps): ReactElement {
  const [mode, setMode] = useSearchMode();
  const client = searchClient((next) => {
    setMode(next === undefined ? Option.none() : Option.some(next));
  });
  const { search, setSearch, query } = useDocsSearch({ client });
  return (
    <SearchDialog
      isLoading={query.isLoading}
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
        <SearchDialogList items={query.data === "empty" ? null : query.data} />
      </SearchDialogContent>
      <SearchDialogFooter>
        {Option.isSome(mode) && mode.value === WIKI_SEARCH_MODE.keywordOnly ? (
          <span>{keywordOnlyNotice}</span>
        ) : null}
      </SearchDialogFooter>
    </SearchDialog>
  );
}

export { WikiSearchDialog };
