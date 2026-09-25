import { WikiSearchHits } from "@repo/config";
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";

import { WikiPageNotFound } from "./wiki-page-not-found.ts";

const searchWiki = Rpc.make("searchWiki", {
  payload: { query: Schema.String },
  success: WikiSearchHits,
});

const listWikiPages = Rpc.make("listWikiPages", {
  payload: {},
  success: Schema.String,
});

const readWikiPage = Rpc.make("readWikiPage", {
  error: WikiPageNotFound,
  payload: { url: Schema.String },
  success: Schema.String,
});

class WikiRpcs extends RpcGroup.make(searchWiki, listWikiPages, readWikiPage) {}

export { WikiRpcs, readWikiPage, searchWiki };
