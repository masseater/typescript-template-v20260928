import { WikiRpcs, makeRpcClient } from "@repo/core-api";
import { reportFailure } from "@repo/observability";
import { Cause, Effect } from "effect";
import { z } from "zod";

import type { WikiServices } from "#shared/wiki/index.ts";
import type { McpServer } from "@modelcontextprotocol/server";
import type { ServiceFetcher } from "@repo/config";
import type { Context } from "effect";
import type { RpcClient, RpcGroup } from "effect/unstable/rpc";
import type { RpcClientError } from "effect/unstable/rpc/RpcClientError";

type WikiClient = RpcClient.RpcClient<RpcGroup.Rpcs<typeof WikiRpcs>, RpcClientError>;
type ToolResult = { content: { text: string; type: "text" }[]; isError?: boolean };

function text(content: string): ToolResult {
  return { content: [{ text: content, type: "text" }] };
}

type WikiTools = Readonly<{ binding: ServiceFetcher; context: Context.Context<WikiServices> }>;

function callWiki(
  tools: WikiTools,
  call: (wiki: WikiClient) => Effect.Effect<ToolResult, RpcClientError>,
): Promise<ToolResult> {
  return Effect.runPromiseWith(tools.context)(
    makeRpcClient(WikiRpcs, tools.binding).pipe(
      Effect.flatMap(call),
      Effect.catchTag("RpcClientError", (error) =>
        reportFailure(Cause.fail(error)).pipe(
          Effect.as({ ...text("wiki is unavailable"), isError: true }),
        ),
      ),
      Effect.scoped,
    ),
  );
}

function registerWikiTools(server: McpServer, tools: WikiTools): void {
  server.registerTool(
    "search",
    {
      description:
        'Search docs pages with a query. Returns { mode, results }. mode "semantic" means the search used meaning and keywords. mode "keyword_only" means semantic search was unavailable and only keywords were matched, so a page missing from results may still cover the query.',
      inputSchema: z.object({ query: z.string() }),
      title: "Search Docs",
    },
    ({ query }) =>
      callWiki(tools, (wiki) =>
        wiki.searchWiki({ query }).pipe(Effect.map((hits) => text(JSON.stringify(hits)))),
      ),
  );
  server.registerTool(
    "list_pages",
    {
      description: "List all docs pages with their pathnames (URLs)",
      inputSchema: z.object({}),
      title: "List Pages",
    },
    () => callWiki(tools, (wiki) => wiki.listWikiPages({}).pipe(Effect.map(text))),
  );
  server.registerTool(
    "get_page",
    {
      description: "Get the Markdown content of a docs page by its pathname (URL)",
      inputSchema: z.object({ url: z.string() }),
      title: "Get Page",
    },
    ({ url }) =>
      callWiki(tools, (wiki) =>
        wiki.readWikiPage({ url }).pipe(
          Effect.map(text),
          Effect.catchTag("WikiPageNotFound", () =>
            Effect.succeed({ ...text(`page not found: ${url}`), isError: true }),
          ),
        ),
      ),
  );
}

export { registerWikiTools };
