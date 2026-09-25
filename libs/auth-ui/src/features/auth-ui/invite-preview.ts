import { httpStatus } from "@repo/config";
import { InvitePreview } from "@repo/runtime/contracts";
import { Effect } from "effect";
import { FetchHttpClient, HttpClient, type HttpClientResponse } from "effect/unstable/http";

import { browserHttp } from "./browser-http.ts";
import { InvitePreviewFailed } from "./invite-preview-failed.ts";
import { InvitePreviewUnreachable } from "./invite-preview-unreachable.ts";
import { decodeJson } from "./protocol.ts";

type Invitation =
  | Readonly<{ email: string; status: "available" }>
  | Readonly<{ status: "closed" }>
  | Readonly<{ responseStatus: number; status: "failed" }>
  | Readonly<{ status: "unreachable" }>;

const readInvitation = (
  served: Readonly<Pick<HttpClientResponse.HttpClientResponse, "json" | "status">>,
): Effect.Effect<Invitation, InvitePreviewFailed> =>
  Effect.gen(function* decodeInvitation() {
    if (served.status === httpStatus.notFound) {
      return { status: "closed" } as const;
    }
    if (served.status < 200 || served.status >= 300) {
      return yield* new InvitePreviewFailed({ status: served.status });
    }
    const servedInvite = yield* served.json.pipe(Effect.orDie);
    return { email: decodeJson(InvitePreview, servedInvite).email, status: "available" } as const;
  });

const loadInvitation = (
  previewLocation: URL,
): Effect.Effect<Invitation, InvitePreviewFailed | InvitePreviewUnreachable> =>
  Effect.gen(function* previewInvitationToken() {
    const served = yield* HttpClient.get(previewLocation.toString()).pipe(
      Effect.provide(browserHttp),
      Effect.provideService(FetchHttpClient.RequestInit, {
        cache: "no-store",
        credentials: "same-origin",
      }),
      Effect.mapError((cause) => new InvitePreviewUnreachable({ cause })),
    );
    return yield* readInvitation(served);
  });

const previewInvitation = (endpoint: string, token: string): Promise<Invitation> => {
  const previewLocation = new URL(endpoint, globalThis.location.origin);
  previewLocation.searchParams.set("token", token);
  return Effect.runPromise(
    loadInvitation(previewLocation).pipe(
      Effect.catchTags({
        InvitePreviewFailed: (failed) =>
          Effect.succeed({ responseStatus: failed.status, status: "failed" } as const),
        InvitePreviewUnreachable: () => Effect.succeed({ status: "unreachable" } as const),
      }),
    ),
  );
};

export { loadInvitation, previewInvitation, readInvitation };
export type { Invitation };
