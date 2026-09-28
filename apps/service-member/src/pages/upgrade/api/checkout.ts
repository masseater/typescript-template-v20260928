import { apiData } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";

import { userClient } from "#shared/api/index.ts";
import { HostedPage, OfferView } from "#shared/contracts/index.ts";

type Offer = typeof OfferView.Type;

function loadOffer(): Promise<Offer> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.billing.offer.get().then((reply) => apiData(OfferView, reply)),
  );
}

const offerOptions = queryOptions({
  queryFn: loadOffer,
  queryKey: ["offer"],
  retry: false,
});

function startCheckout(): Promise<void> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.billing.checkout.post({}).then((response) => {
      globalThis.location.assign(apiData(HostedPage, response).url);
    }),
  );
}

export { offerOptions, startCheckout };
export type { Offer };
