import { apiData } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";

import { userClient } from "#shared/api/index.ts";
import { RecoveryAccepted, RecoveryOfferView } from "#shared/contracts/index.ts";

function loadRecoveryOffer(): Promise<typeof RecoveryOfferView.Type> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api["recovery-offer"].get().then((response) => apiData(RecoveryOfferView, response)),
  );
}

const recoveryOfferOptions = queryOptions({
  queryFn: loadRecoveryOffer,
  queryKey: ["recovery-offer"],
  retry: false,
  staleTime: Number.POSITIVE_INFINITY,
});

function acceptRecovery(): Promise<typeof RecoveryAccepted.Type> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.recovery.accept.post().then((response) => apiData(RecoveryAccepted, response)),
  );
}

function declineRecovery(): Promise<typeof RecoveryAccepted.Type> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.recovery.decline.post().then((response) => apiData(RecoveryAccepted, response)),
  );
}

export { acceptRecovery, declineRecovery, recoveryOfferOptions };
