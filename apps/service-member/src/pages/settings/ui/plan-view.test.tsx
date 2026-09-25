import { actionState, primaryActions, renderedAt } from "@repo/ui/testing";
import { describe, expect, it } from "vite-plus/test";

import { PlanView } from "./plan-view.tsx";

import type { PlanSummary } from "#pages/settings/model/plan-summary.ts";
import type { ActionState } from "@repo/ui";

const free = {
  attention: undefined,
  headline: "無料プラン",
  manageable: false,
  periodEnd: undefined,
  upgradable: true,
} as const satisfies PlanSummary;

const paid = {
  attention: "支払いに失敗しました。",
  headline: "有料プラン",
  manageable: true,
  periodEnd: "令和8年10月20日 に更新されます。",
  upgradable: false,
} as const satisfies PlanSummary;

function rendered(
  summary: PlanSummary,
  checkoutPending: boolean,
  action: ActionState = actionState(),
): string {
  return renderedAt(
    <PlanView
      action={action}
      checkoutPending={checkoutPending}
      onManage={() => undefined}
      onReload={() => undefined}
      summary={summary}
    />,
    ["/settings/plan", "/upgrade"],
  );
}

describe("plan view", () => {
  it("offers the paid plans to a free member without anything to manage", () => {
    expect.hasAssertions();
    const html = rendered(free, false);
    expect(html).toContain(free.headline);
    expect(html).toContain('href="/upgrade"');
    expect(html).not.toContain("プランを管理する");
    expect(html).not.toContain("最新の状態を確かめる");
  });

  it("asks to check again while a finished checkout is still being applied", () => {
    expect.hasAssertions();
    const html = rendered(free, true);
    expect(html).toContain("契約の手続きを受け付けました。");
    expect(html).toContain("最新の状態を確かめる");
  });

  it("shows the period, the warning and the portal to a paying member", () => {
    expect.hasAssertions();
    const html = rendered(paid, false, actionState({ pending: true }));
    expect(html).toContain(paid.periodEnd);
    expect(html).toContain(paid.attention);
    expect(html).toContain("プランを管理する");
    expect(html).toContain("支払い事業者の管理ページ");
    expect(html).toContain("管理ページへ移動しています。");
    expect(html).not.toContain('href="/upgrade"');
  });

  it.for([
    ["a free member", free],
    ["a paying member", paid],
    ["a member with a contract but no paid plan", { ...free, manageable: true }],
  ] as const)("shows %s one primary action", ([, summary]) => {
    expect.hasAssertions();
    expect(primaryActions(rendered(summary, true))).toBe(1);
  });

  it("keeps managing the contract primary when the paid plans are offered too", () => {
    expect.hasAssertions();
    const html = rendered({ ...free, manageable: true }, false);
    const upgradeLink = /<a[^>]*href="\/upgrade"[^>]*>/u.exec(html)?.[0] ?? "";
    expect(upgradeLink).toContain('data-variant="secondary"');
    expect(primaryActions(html)).toBe(1);
  });
});
