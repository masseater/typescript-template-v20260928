import { useQuery } from "@tanstack/react-query";

import { consentClientOptions } from "#pages/consent/api/consent.ts";

function useConsentClient(clientId: string) {
  return useQuery(consentClientOptions(clientId));
}

export { useConsentClient };
