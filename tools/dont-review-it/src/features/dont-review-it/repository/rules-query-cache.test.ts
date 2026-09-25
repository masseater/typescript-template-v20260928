import { describe, expect, it } from "vite-plus/test";

import { reported } from "./lint-harness-test-fixture.ts";

const layoutWithLoader =
  'export const Route = createFileRoute("/_member")({ loader: () => load(), component: Layout });\n';
const layoutWithBeforeLoad =
  'export const Route = createFileRoute("/_member")({ beforeLoad: () => enter(), component: Layout });\n';

describe("layout route loaders", () => {
  it.for([
    "apps/service-member/src/app/routes/_member.tsx",
    "apps/service-admin/src/app/routes/_admin.tsx",
    "apps/internal-dashboard/src/app/routes/__root.tsx",
  ])("rejects a loader in %s", (name) => {
    expect.hasAssertions();
    expect(reported("layout-route-loader", { code: layoutWithLoader, filename: name })).toBe(true);
  });

  it.for([
    "apps/service-member/src/app/routes/_member/board.index.tsx",
    "apps/service-member/src/app/routes/index.tsx",
    "apps/service-member/src/pages/board/ui/board-page.tsx",
  ])("allows a loader in %s", (name) => {
    expect.hasAssertions();
    expect(reported("layout-route-loader", { code: layoutWithLoader, filename: name })).toBe(
      false,
    );
  });

  it("allows beforeLoad in a layout route", () => {
    expect.hasAssertions();
    expect(
      reported("layout-route-loader", {
        code: layoutWithBeforeLoad,
        filename: "apps/service-member/src/app/routes/_member.tsx",
      }),
    ).toBe(false);
  });
});

describe("query cache writes", () => {
  it.for([
    ["setQueryData", "queries.setQueryData(key, value);\n"],
    ["setQueriesData", "queries.setQueriesData({ queryKey }, value);\n"],
    ["a computed setQueryData", 'queries["setQueryData"](key, value);\n'],
  ] as const)("rejects %s in app code", ([_label, code]) => {
    expect.hasAssertions();
    expect(
      reported("query-cache-write", {
        code,
        filename: "apps/service-member/src/app/entry-conditions.ts",
      }),
    ).toBe(true);
  });

  it.for([
    "apps/service-admin/src/pages/users/api/list-users.test.ts",
    "libs/auth-ui/src/features/auth-ui/api/session.ts",
  ])("allows setQueryData in %s", (name) => {
    expect.hasAssertions();
    expect(
      reported("query-cache-write", { code: "queries.setQueryData(key, value);\n", filename: name }),
    ).toBe(false);
  });

  it("allows invalidating a key", () => {
    expect.hasAssertions();
    expect(
      reported("query-cache-write", {
        code: "void queries.invalidateQueries({ queryKey });\n",
        filename: "apps/service-member/src/pages/notifications/ui/notifications-page.tsx",
      }),
    ).toBe(false);
  });
});
