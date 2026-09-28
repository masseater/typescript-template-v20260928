import { CONSENT_CLIENT, lookupConsentClient, type ConsentClient } from "@repo/auth-ui/consent";
import { getRouteApi } from "@tanstack/react-router";
import { Effect } from "effect";
import { useEffect, useState } from "react";

import { ConsentView } from "./consent-view.tsx";

import type { ReactElement } from "react";

const consentRoute = getRouteApi("/consent");

const unknownClientMessage = "連携を求めているクライアントが分かりません。";

function loadConsentClient(clientId: string): Promise<ConsentClient> {
  return Effect.runPromise(
    lookupConsentClient(fetch, {
      clientId,
      init: { cache: "no-store", credentials: "same-origin" },
      origin: globalThis.location.origin,
    }),
  );
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function useClientName(
  clientId: string | undefined,
  onError: (message: string) => void,
): string | undefined {
  const [client, setClient] = useState<string>();
  useEffect(() => {
    const state = { active: true };
    function load(id: string): void {
      void loadConsentClient(id)
        .then((consentClient) => {
          if (!state.active) {
            return;
          }
          if (consentClient.kind === CONSENT_CLIENT.signInRequired) {
            globalThis.location.assign(`/login${globalThis.location.search}`);
            return;
          }
          if (consentClient.kind === CONSENT_CLIENT.unknown) {
            onError(unknownClientMessage);
            return;
          }
          setClient(consentClient.name);
        })
        .catch((error: unknown) => {
          if (state.active) {
            onError(messageOf(error));
          }
        });
    }
    if (clientId !== undefined) {
      load(clientId);
    }
    return (): void => {
      state.active = false;
    };
  }, [clientId, onError]);
  return client;
}

function ConsentPage(): ReactElement {
  const { client_id: clientId } = consentRoute.useSearch();
  const [error, setError] = useState("");
  const client = useClientName(clientId, setError);
  return <ConsentView client={client} clientId={clientId} error={error} onError={setError} />;
}

export { ConsentPage };
