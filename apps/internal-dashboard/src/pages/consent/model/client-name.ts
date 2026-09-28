import { clientNameOptions } from "@repo/auth-ui";
import { useQuery } from "@tanstack/react-query";

function useClientName(clientId: string) {
  return useQuery(clientNameOptions(clientId));
}

export { useClientName };
