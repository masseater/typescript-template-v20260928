import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { callMcpTool } from "@repo/auth/testing";
import { APPLICATION } from "@repo/config";
import { WikiPageNotFound, WikiRpcs, createRpcFetcher } from "@repo/core-api";
import { appEnvironment } from "@repo/runtime/testing";
import { workerRuntime } from "@repo/runtime/worker";
import { Effect, Layer } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { routes } from "#shared/telemetry/index.ts";
import { wikiLayer, type WikiServices } from "#shared/wiki/index.ts";
import { registerWikiTools } from "./mcp-wiki-tools.ts";

const wikiOrigin = "http://127.0.0.1:3003";

const keywordOnlyHits = {
  mode: "keyword_only",
  results: [{ content: "Getting started", id: "/docs", type: "page", url: "/docs" }],
} as const;

describe("the wiki search tool", () => {
  const it = test.extend("searchReply", async ({}, { onCleanup }) => {
    const runtime = workerRuntime(() => Layer.orDie(wikiLayer(appEnvironment(), routes)));
    const context = await runtime.runPromise(Effect.context<WikiServices>());
    const wikiApi = createRpcFetcher(
      WikiRpcs,
      WikiRpcs.toLayer({
        listWikiPages: () => Effect.succeed(""),
        readWikiPage: ({ url }: Readonly<{ url: string }>) =>
          Effect.fail(new WikiPageNotFound({ url })),
        searchWiki: () => Effect.succeed(keywordOnlyHits),
      }),
    );
    onCleanup(() => wikiApi.dispose());
    const handler = createMcpHandler(() => {
      const server = new McpServer({ name: APPLICATION.wiki, version: "1.0.0" });
      registerWikiTools(server, {
        binding: { fetch: (input, init) => wikiApi.fetch(new Request(input, init)) },
        context,
      });
      return server;
    });
    return Effect.runPromise(
      callMcpTool(
        {
          fetchMcp: (outgoing) => Effect.promise(() => handler.fetch(outgoing)),
          origin: wikiOrigin,
          token: "",
        },
        { arguments: { query: "setup" }, name: "search" },
      ),
    );
  });

  it("tells the caller that only keywords were searched", ({ searchReply }) => {
    expect(searchReply).toStrictEqual({
      id: 1,
      jsonrpc: "2.0",
      result: { content: [{ text: JSON.stringify(keywordOnlyHits), type: "text" }] },
    });
  });
});
