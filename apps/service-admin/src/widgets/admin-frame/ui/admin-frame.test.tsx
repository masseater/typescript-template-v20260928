import { AppProviders } from "@repo/ui/shell";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { Effect } from "effect";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";

import { fieldValidationMessages } from "#shared/i18n/index.ts";
import { AdminFrame } from "./admin-frame.tsx";

const paths = ["/members", "/inquiries", "/reports", "/terms", "/admins", "/security"] as const;

function renderAdminFrame(defaultCollapsed: boolean): Promise<string> {
  return Effect.runPromise(
    Effect.gen(function* loadFrame() {
      const rootRoute = createRootRoute({
        component: () =>
          createElement(AppProviders, {
            children: createElement(AdminFrame, {
              children: createElement("p", null, "本文"),
              defaultCollapsed,
              email: "ada@example.com",
              name: "Ada",
            }),
            fieldValidationMessages: fieldValidationMessages("ja"),
          }),
      });
      const router = createRouter({
        history: createMemoryHistory({ initialEntries: ["/members"] }),
        routeTree: rootRoute.addChildren(
          paths.map((path) =>
            createRoute({
              component: () => createElement("span"),
              getParentRoute: () => rootRoute,
              path,
            }),
          ),
        ),
      });
      yield* Effect.promise(() => router.load());
      return renderToStaticMarkup(createElement(RouterProvider, { router }));
    }),
  );
}

describe("管理画面の枠", () => {
  const it = test
    .extend("theCollapsedFrame", () => renderAdminFrame(true))
    .extend("theExpandedFrame", () => renderAdminFrame(false));

  it("折りたたみ時の名前は管理画面で、検索欄はない", ({ theCollapsedFrame }) => {
    expect.hasAssertions();
    expect(theCollapsedFrame).toContain(">管理画面</span>");
    expect(theCollapsedFrame).toContain('<span aria-hidden="true">管理</span>');
    expect(theCollapsedFrame).toContain('href="/members"');
    expect(theCollapsedFrame).toContain("利用者の一覧");
    expect(theCollapsedFrame).toContain("本文");
    expect(theCollapsedFrame).not.toContain("<input");
    expect(theCollapsedFrame).not.toContain("検索");
    expect(theCollapsedFrame).not.toContain(">管<");
  });

  it("開いた枠は副題と行き先を出す", ({ theExpandedFrame }) => {
    expect.hasAssertions();
    expect(theExpandedFrame).toContain("運用コンソール");
    expect(theExpandedFrame).toContain(">利用者<");
  });
});
