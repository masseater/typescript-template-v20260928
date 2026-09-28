import { CONSENT_CLIENT } from "@repo/auth-ui/consent";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Schema } from "effect";

import { ConsentRoute, loadConsentClient } from "#pages/account/consent/index.ts";

const searchSchema = Schema.toStandardSchemaV1(
  Schema.Struct({
    client_id: Schema.optionalKey(Schema.String),
    scope: Schema.optionalKey(Schema.String),
  }),
);

type ConsentSearch = Readonly<{ client_id?: string | undefined; scope?: string | undefined }>;

const Route = createFileRoute("/consent")({
  component: ConsentRoute,
  validateSearch: searchSchema,
  loaderDeps: ({ search }: Readonly<{ search: ConsentSearch }>) => ({
    clientId: search.client_id,
  }),
  loader: ({
    deps,
    location,
  }: Readonly<{
    deps: Readonly<{ clientId: string | undefined }>;
    location: Readonly<{ searchStr: string }>;
  }>) => {
    if (deps.clientId === undefined) {
      return Promise.resolve(undefined);
    }
    return loadConsentClient(deps.clientId).then((client) => {
      if (client.kind === CONSENT_CLIENT.signInRequired) {
        throw redirect({ href: `/login${location.searchStr}` });
      }
      return client.kind === CONSENT_CLIENT.found ? client.name : undefined;
    });
  },
});

export { Route };
