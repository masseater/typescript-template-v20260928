import { renderedAt } from "@repo/ui/testing";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vite-plus/test";

import { memberSummaryOptions } from "#shared/api/index.ts";
import { MemberDetailPage } from "./member-detail-page.tsx";

const summary = { email: "hanako@example.com", id: "member-1", name: "山田 花子" } as const;

function rendered(loaded: boolean): string {
  const client = new QueryClient();
  if (loaded) {
    client.setQueryData(memberSummaryOptions(summary.id).queryKey, summary);
  }
  return renderedAt(
    <QueryClientProvider client={client}>
      <MemberDetailPage memberId={summary.id} />
    </QueryClientProvider>,
    ["/members/$id"],
  );
}

describe("member detail page", () => {
  it("shows the name and email of the member", () => {
    expect.hasAssertions();
    const html = rendered(true);
    expect(html).toContain(summary.name);
    expect(html).toContain(summary.email);
  });

  it("says it is loading until the member arrives", () => {
    expect.hasAssertions();
    expect(rendered(false)).toContain("読み込み中です。");
  });
});
