import { httpStatus } from "@repo/config";
import { Effect, Schema } from "effect";

const ConsentSearch = Schema.Struct({ client_id: Schema.optionalKey(Schema.String) });
const consentSearch = Schema.toStandardSchemaV1(ConsentSearch);

const OAuthClientView = Schema.Struct({ client_name: Schema.optionalKey(Schema.String) });

const ConsentBody = Schema.Struct({
  accept: Schema.Boolean,
  oauth_query: Schema.String,
  scope: Schema.optionalKey(Schema.String),
});
const encodeConsentBody = Schema.encodePromise(Schema.fromJsonString(ConsentBody));

const postConsent = (fetchImpl: typeof fetch, decision: string): Promise<Response> =>
  fetchImpl("/api/auth/oauth2/consent", {
    body: decision,
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    method: "POST",
  });

class ConsentClientUnavailable extends Schema.TaggedError<ConsentClientUnavailable>()(
  "ConsentClientUnavailable",
  { cause: Schema.Defect() },
) {
  override get message(): string {
    return "クライアントの情報を取得できませんでした。";
  }
}

const consentClientKinds = ["found", "signInRequired", "unknown"] as const;
const CONSENT_CLIENT = {
  found: consentClientKinds[0],
  signInRequired: consentClientKinds[1],
  unknown: consentClientKinds[2],
} as const satisfies Record<string, (typeof consentClientKinds)[number]>;

type ConsentClient =
  | Readonly<{ kind: typeof CONSENT_CLIENT.found; name: string }>
  | Readonly<{ kind: typeof CONSENT_CLIENT.signInRequired }>
  | Readonly<{ kind: typeof CONSENT_CLIENT.unknown }>;

const publicClientUrl = (origin: string, clientId: string): string =>
  new URL(
    `/api/auth/oauth2/public-client?${new URLSearchParams({ client_id: clientId }).toString()}`,
    origin,
  ).toString();

const lookupConsentClient = (
  fetchImpl: typeof fetch,
  lookup: Readonly<{ clientId: string; init: RequestInit; origin: string }>,
): Effect.Effect<ConsentClient, ConsentClientUnavailable> =>
  Effect.gen(function* lookupClient() {
    const served = yield* Effect.tryPromise({
      catch: (cause) => new ConsentClientUnavailable({ cause }),
      try: () => fetchImpl(publicClientUrl(lookup.origin, lookup.clientId), lookup.init),
    });
    if (served.status === httpStatus.unauthorized) {
      return { kind: CONSENT_CLIENT.signInRequired };
    }
    if (served.status === httpStatus.notFound) {
      return { kind: CONSENT_CLIENT.unknown };
    }
    if (!served.ok) {
      return yield* new ConsentClientUnavailable({
        cause: new Error(`public-client answered ${served.status}`),
      });
    }
    const body = yield* Effect.tryPromise({
      catch: (cause) => new ConsentClientUnavailable({ cause }),
      try: (): Promise<unknown> => served.json(),
    });
    const view = yield* Schema.decodeUnknownEffect(OAuthClientView)(body).pipe(
      Effect.mapError((cause) => new ConsentClientUnavailable({ cause })),
    );
    return { kind: CONSENT_CLIENT.found, name: view.client_name ?? lookup.clientId };
  });

export {
  CONSENT_CLIENT,
  ConsentClientUnavailable,
  consentSearch,
  encodeConsentBody,
  lookupConsentClient,
  postConsent,
};
export type { ConsentClient };
