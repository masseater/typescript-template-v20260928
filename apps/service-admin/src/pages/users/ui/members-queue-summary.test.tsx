import { renderedAt } from "@repo/ui/testing";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vite-plus/test";

import { pendingCountOptions } from "#shared/api/index.ts";
import { MembersQueueSummary } from "./members-queue-summary.tsx";

function rendered(pendingCount: number | undefined): string {
  const client = new QueryClient();
  if (pendingCount !== undefined) {
    client.setQueryData(pendingCountOptions.queryKey, pendingCount);
  }
  return renderedAt(
    <QueryClientProvider client={client}>
      <MembersQueueSummary />
    </QueryClientProvider>,
    ["/users"],
  );
}

describe("members queue summary", () => {
  it("shows the pending inquiry count the API returned", () => {
    expect.hasAssertions();
    expect(rendered(7)).toMatch(/対応待ちの問い合わせ<\/p><h2[^>]*>7<\/h2>/u);
  });

  it("says it is loading until the count arrives", () => {
    expect.hasAssertions();
    expect(rendered(undefined)).toContain("読み込み中です。");
  });
});
