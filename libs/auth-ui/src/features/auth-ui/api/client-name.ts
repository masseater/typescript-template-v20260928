import { httpStatus } from "@repo/config";
import {
  queryOptions,
  type QueryKeyWithDataTag,
  type UnusedSkipTokenOptions,
} from "@tanstack/react-query";
import { Effect } from "effect";
import { HttpClientResponse } from "effect/unstable/http";

import { browserGet } from "../browser-http.ts";
import { OAuthClientView } from "../oauth-consent.ts";

const readClientName = (clientId: string): Effect.Effect<string | null> =>
  Effect.gen(function* readName() {
    const served = yield* browserGet(
      `/api/auth/oauth2/public-client?${new URLSearchParams({ client_id: clientId }).toString()}`,
      { cache: "no-store", credentials: "same-origin" },
    );
    if (served.status === httpStatus.unauthorized) {
      globalThis.location.assign(`/login${globalThis.location.search}`);
      return null;
    }
    const client = yield* HttpClientResponse.filterStatusOk(served).pipe(
      Effect.flatMap(HttpClientResponse.schemaBodyJson(OAuthClientView)),
      Effect.mapError(() => new Error("クライアントの情報を取得できませんでした。")),
      Effect.orDie,
    );
    return client.client_name ?? clientId;
  });

type ClientNameKey = readonly ["oauth-client-name", string];

const clientNameOptions = (
  clientId: string,
): UnusedSkipTokenOptions<string | null, Error, string | null, ClientNameKey> &
  QueryKeyWithDataTag<ClientNameKey, string | null, Error> =>
  queryOptions({
    queryFn: () => Effect.runPromise(readClientName(clientId)),
    queryKey: ["oauth-client-name", clientId] as const,
    retry: false,
  });

export { clientNameOptions };
