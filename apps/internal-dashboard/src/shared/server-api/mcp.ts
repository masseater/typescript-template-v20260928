import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { APPLICATION, readWikiBindings, wikiApiBinding } from "@repo/config";
import { AppOrigin, secureResponse } from "@repo/runtime/http";
import { env } from "cloudflare:workers";
import { Effect } from "effect";

import { authorizeMcpRequest } from "#shared/wiki/index.ts";
import { registerDashboardTools } from "./mcp-dashboard.ts";
import { registerWikiTools } from "./mcp-wiki-tools.ts";

import type { WikiServices } from "#shared/wiki/index.ts";
import type { ServiceFetcher } from "@repo/config";
import type { Context } from "effect";

const mcpVersion = "1.0.0";

function createServer(binding: ServiceFetcher, context: Context.Context<WikiServices>): McpServer {
  const server = new McpServer({ name: APPLICATION.wiki, version: mcpVersion });
  registerWikiTools(server, { binding, context });
  registerDashboardTools(server, context);
  return server;
}

const handleMcp = Effect.fn("handleMcp")(function* handleMcp(request: Request) {
  const bindings = yield* readWikiBindings(env).pipe(Effect.orDie);
  const context = yield* Effect.context<WikiServices>();
  const handler = createMcpHandler(() => createServer(bindings[wikiApiBinding], context));
  return yield* Effect.promise(() => handler.fetch(request));
});

const serveMcp = Effect.fn("serveMcp")(function* serveMcp(request: Request) {
  const authorized = yield* authorizeMcpRequest(request, yield* AppOrigin);
  if (authorized instanceof Response) {
    return authorized;
  }
  return secureResponse({ httpRequest: request, httpResponse: yield* handleMcp(request) });
});

export { serveMcp };
