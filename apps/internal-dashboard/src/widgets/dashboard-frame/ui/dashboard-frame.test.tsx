import { japaneseFieldValidationMessages } from "@repo/ui";
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

import { DashboardFrame } from "./dashboard-frame.tsx";

const paths = [
  "/",
  "/inquiries",
  "/recordings",
  "/audit",
  "/flags",
  "/staff",
  "/security",
  "/wiki",
] as const;

function renderDashboardFrame(defaultCollapsed: boolean): Promise<string> {
  return Effect.runPromise(
    Effect.gen(function* loadFrame() {
      const rootRoute = createRootRoute({
        component: () =>
          createElement(AppProviders, {
            children: createElement(DashboardFrame, {
              children: createElement("p", null, "本文"),
              defaultCollapsed,
              email: "ada@example.com",
              name: "Ada",
            }),
            fieldValidationMessages: japaneseFieldValidationMessages,
          }),
      });
      const router = createRouter({
        history: createMemoryHistory({ initialEntries: ["/inquiries"] }),
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

describe("社内ダッシュボードの枠", () => {
  const it = test
    .extend("theCollapsedFrame", () => renderDashboardFrame(true))
    .extend("theExpandedFrame", () => renderDashboardFrame(false));

  it("折りたたみ時の名前は社内ダッシュボードで、検索欄はない", ({ theCollapsedFrame }) => {
    expect.hasAssertions();
    expect(theCollapsedFrame).toContain(">社内ダッシュボード</span>");
    expect(theCollapsedFrame).toContain('<span aria-hidden="true">社内</span>');
    expect(theCollapsedFrame).toContain('href="/inquiries"');
    expect(theCollapsedFrame).toContain("問い合わせ");
    expect(theCollapsedFrame).toContain("Google Analytics");
    expect(theCollapsedFrame).toContain('href="/wiki/"');
    expect(theCollapsedFrame).toContain("本文");
    expect(theCollapsedFrame).not.toContain("<input");
    expect(theCollapsedFrame).not.toContain("この画面内を検索");
    expect(theCollapsedFrame).not.toContain(">社<");
  });

  it("開いた枠は副題と行き先を出す", ({ theExpandedFrame }) => {
    expect.hasAssertions();
    expect(theExpandedFrame).toContain("状況と運営");
    expect(theExpandedFrame).toContain(">概要<");
  });
});
