import { Schema } from "effect";

/** @canonical-values config.wiki-search-mode */
export const wikiSearchModes = ["semantic", "keyword_only"] as const;
export const WikiSearchMode = Schema.Literals(wikiSearchModes);
export type WikiSearchMode = typeof WikiSearchMode.Type;
export const WIKI_SEARCH_MODE = {
  keywordOnly: wikiSearchModes[1],
  semantic: wikiSearchModes[0],
} as const;

/** @canonical-values config.wiki-search-hit-kind */
export const wikiSearchHitKinds = ["page", "heading", "text"] as const;

export const WikiSearchHits = Schema.Struct({
  mode: WikiSearchMode,
  results: Schema.Array(
    Schema.Struct({
      content: Schema.String,
      id: Schema.String,
      type: Schema.Literals(wikiSearchHitKinds),
      url: Schema.String,
    }),
  ),
});
export type WikiSearchHits = typeof WikiSearchHits.Type;
