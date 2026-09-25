import { httpStatus, type Application } from "@repo/config";
import { Elysia, NotFound, status, type AnyElysia } from "elysia";
import { WebStandardAdapter } from "elysia/adapter/web-standard";

import { failureBody, type Failure, type FailureBody, type FailureStatus } from "./failures.ts";
import { docsPath, hidden, openApiDocument, referencePage, type Guard } from "./openapi.ts";
import { jsonResponse } from "./responses.ts";

type ElysiaContext = {
  readonly request: Request;
};
type Failed = ReturnType<typeof status<FailureStatus, FailureBody>>;

const apiRoot = "/api";

const missingMessage = "見つかりませんでした。";

const createApi = <const Prefix extends string>(prefix: Prefix) =>
  new Elysia({ adapter: WebStandardAdapter, prefix })
    .guard({ parse: "none" })
    .error(({ error: thrown }) =>
      thrown instanceof NotFound
        ? status(httpStatus.notFound, { error: missingMessage })
        : undefined,
    );

const failedStatus = (failure: Failure): Failed => status(failure.status, failureBody(failure));

const apiDocs =
  (audience: Application, docsGuard?: Guard) =>
  <App extends AnyElysia>(app: App): App => {
    const docs = new Elysia({ adapter: WebStandardAdapter })
      .get(docsPath, hidden, () => referencePage(audience))
      .get(`${docsPath}/json`, hidden, () => jsonResponse(openApiDocument(app.routes, audience)));
    return docsGuard === undefined
      ? (app.use(docs) as App)
      : (app.use(
          new Elysia({ adapter: WebStandardAdapter }).beforeHandle(docsGuard).use(docs),
        ) as App);
  };

const eventStreamType = "text/event-stream";

const headersWithLength = async (fetched: Response): Promise<Headers> => {
  if (fetched.headers.get("content-type")?.startsWith(eventStreamType) === true) {
    void fetched.body?.cancel();
    return new Headers(fetched.headers);
  }
  const fetchedBytes = await fetched.arrayBuffer();
  return new Headers([
    ...[...fetched.headers].filter(([headerName]) => headerName !== "content-length"),
    ["content-length", String(fetchedBytes.byteLength)],
  ]);
};

type ElysiaHandler = (served: ElysiaContext) => Promise<Response>;

const elysiaServer = (
  app: AnyElysia,
): {
  readonly handlers: Readonly<{
    ANY: ElysiaHandler;
    HEAD: ElysiaHandler;
  }>;
} => ({
  handlers: {
    ANY: async (served) => app.fetch(served.request),
    HEAD: async (served) => {
      const { headers: asked, url } = served.request;
      const fetched = await app.fetch(new Request(url, { headers: asked, method: "GET" }));
      return new Response(undefined, {
        headers: await headersWithLength(fetched),
        status: fetched.status,
        statusText: fetched.statusText,
      });
    },
  },
});

export { apiDocs, apiRoot, createApi, elysiaServer, failedStatus };
export type { ElysiaContext, ElysiaHandler, Failed };
