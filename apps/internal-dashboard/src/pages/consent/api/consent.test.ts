import { CONSENT_CLIENT } from "@repo/auth-ui/consent";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vite-plus/test";

import { consentClientOptions } from "./consent.ts";

describe("oauth consent client queries", () => {
  it("keeps each client on its own key", () => {
    expect.hasAssertions();
    const client = new QueryClient();
    const ada = consentClientOptions("ada");
    const bob = consentClientOptions("bob");
    client.setQueryData(ada.queryKey, { kind: CONSENT_CLIENT.found, name: "Ada" });
    client.setQueryData(bob.queryKey, { kind: CONSENT_CLIENT.found, name: "Bob" });
    return client.invalidateQueries({ queryKey: ada.queryKey }).then(() => {
      expect(client.getQueryState(ada.queryKey)?.isInvalidated).toBe(true);
      expect(client.getQueryState(bob.queryKey)?.isInvalidated).toBe(false);
      expect(client.getQueryData(bob.queryKey)).toStrictEqual({ kind: CONSENT_CLIENT.found, name: "Bob" });
    });
  });
});
