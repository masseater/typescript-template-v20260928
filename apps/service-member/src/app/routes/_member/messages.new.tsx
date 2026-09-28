import { createFileRoute, redirect } from "@tanstack/react-router";
import { Option, Schema } from "effect";

import { memberOptions } from "#entities/member/index.ts";
import { ComposeRoute, lookupConversation } from "#pages/messages/index.ts";

import type { QueryClient } from "@tanstack/react-query";

const ComposeSearchParams = Schema.Struct({
  peer: Schema.String.check(Schema.isLengthBetween(1, 256)),
});
type ComposeSearch = typeof ComposeSearchParams.Type;
const decodeComposeSearch = Schema.decodeUnknownOption(ComposeSearchParams);
function requireComposeSearch(raw: unknown): ComposeSearch {
  return Option.getOrThrowWith(decodeComposeSearch(raw), () => {
    throw redirect({
      replace: true,
      search: {},
      to: "/messages",
    });
  });
}
const Route = createFileRoute("/_member/messages/new")({
  component: ComposeRoute,
  validateSearch: requireComposeSearch,
  loaderDeps: ({
    search,
  }: Readonly<{
    search: ComposeSearch;
  }>) => search,
  loader: ({
    context,
    deps,
  }: Readonly<{
    context: Readonly<{ queryClient: QueryClient }>;
    deps: ComposeSearch;
  }>) =>
    lookupConversation(deps.peer).then((existing) =>
      Promise.resolve().then(() => {
        if (existing !== null) {
          throw redirect({
            params: {
              id: existing,
            },
            replace: true,
            search: {},
            to: "/messages/$id",
          });
        }
        return context.queryClient.query(memberOptions(deps.peer));
      }),
    ),
});
export { Route };
