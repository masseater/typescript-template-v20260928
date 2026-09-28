import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vite-plus/test";

import { clientNameOptions } from "./client-name.ts";

describe("oauth client name queries", () => {
  const it = test.extend("theCacheAfterInvalidatingOneClient", async () => {
    const queries = new QueryClient();
    const ada = clientNameOptions("ada");
    const bob = clientNameOptions("bob");
    queries.setQueryData(ada.queryKey, "Ada");
    queries.setQueryData(bob.queryKey, "Bob");
    await queries.invalidateQueries({ queryKey: ada.queryKey });
    return {
      adaInvalidated: queries.getQueryState(ada.queryKey)?.isInvalidated,
      bobInvalidated: queries.getQueryState(bob.queryKey)?.isInvalidated,
      bobName: queries.getQueryData(bob.queryKey),
    };
  });

  it("keeps each client name on its own key", ({ theCacheAfterInvalidatingOneClient }) => {
    expect(theCacheAfterInvalidatingOneClient).toStrictEqual({
      adaInvalidated: true,
      bobInvalidated: false,
      bobName: "Bob",
    });
  });
});
