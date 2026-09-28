import { Acknowledged } from "@repo/runtime/contracts";
import { apiData } from "@repo/runtime/client";

import { userClient } from "#shared/api/index.ts";
import { RecoveryOfferView } from "#shared/contracts/index.ts";

function loadRecoveryOffer(): Promise<typeof RecoveryOfferView.Type> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api["recovery-offer"].get().then((response) => apiData(RecoveryOfferView, response)),
  );
}

function acceptRecovery(): Promise<typeof Acknowledged.Type> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.recovery.accept.post().then((response) => apiData(Acknowledged, response)),
  );
}

function declineRecovery(): Promise<typeof Acknowledged.Type> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.recovery.decline.post().then((response) => apiData(Acknowledged, response)),
  );
}

export { acceptRecovery, declineRecovery, loadRecoveryOffer };
