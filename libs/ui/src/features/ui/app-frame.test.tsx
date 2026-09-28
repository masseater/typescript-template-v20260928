import { RegistryProvider } from "@effect/atom-react";
import {
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { HomeIcon, SearchIcon, UsersIcon } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";

import { AppFrame } from "./app-frame.tsx";
import { Icon } from "./shared/ui/icon.tsx";

const paths = ["/", "/home", "/members", "/upgrade"] as const;

const bottomTabsNav = /<nav aria-label="メイン"(?![^>]*\bid=)[^>]*>/u;

describe("app frame", () => {
  const it = test
    .extend("theSharedChrome", () => {
      const rootRoute = createRootRoute();
      const routeTree = rootRoute.addChildren(
        paths.map((path) => createRoute({ getParentRoute: () => rootRoute, path })),
      );
      const adminRouter = createRouter({
        history: createMemoryHistory({ initialEntries: ["/members"] }),
        routeTree,
      });
      const dashboardRouter = createRouter({
        history: createMemoryHistory({ initialEntries: ["/members"] }),
        routeTree,
      });
      const adminMarkup = renderToStaticMarkup(
        <RegistryProvider>
          <RouterContextProvider router={adminRouter}>
            <AppFrame
              collapsedMark="管理"
              defaultCollapsed
              footer={() => <button type="button">{"アカウント"}</button>}
              navigationId="app-navigation"
              productName="管理画面"
              sections={[
                {
                  destinations: [
                    {
                      badge: 3,
                      icon: <Icon icon={UsersIcon} />,
                      label: "利用者",
                      to: "/members",
                    },
                  ],
                  label: "運用",
                },
              ]}
              subtitle="運用コンソール"
              title="利用者の一覧"
            >
              <p>{"本文"}</p>
            </AppFrame>
          </RouterContextProvider>
        </RegistryProvider>,
      );
      const dashboardMarkup = renderToStaticMarkup(
        <RegistryProvider>
          <RouterContextProvider router={dashboardRouter}>
            <AppFrame
              collapsedMark="社内"
              defaultCollapsed
              footer={() => <button type="button">{"アカウント"}</button>}
              headerActions={<a href="https://example.com/">{"分析"}</a>}
              navigationId="app-navigation"
              productName="社内ダッシュボード"
              sections={[
                {
                  destinations: [
                    {
                      badge: 3,
                      icon: <Icon icon={UsersIcon} />,
                      label: "利用者",
                      to: "/members",
                    },
                  ],
                  label: "運用",
                },
              ]}
              subtitle="状況と運営"
              title="問い合わせ"
            >
              <p>{"本文"}</p>
            </AppFrame>
          </RouterContextProvider>
        </RegistryProvider>,
      );
      return [adminMarkup].map((admin) => ({
        adminHasInput: admin.includes("<input"),
        adminMark: admin.includes('<span aria-hidden="true">管理</span>'),
        adminProduct: admin.includes(">管理画面</span>"),
        adminTitle: admin.includes("利用者の一覧"),
        dashboardActions: dashboardMarkup.includes("分析"),
        dashboardHasInput: dashboardMarkup.includes("<input"),
        dashboardMark: dashboardMarkup.includes('<span aria-hidden="true">社内</span>'),
        dashboardProduct: dashboardMarkup.includes(">社内ダッシュボード</span>"),
        navigationControls: admin.includes('aria-controls="app-navigation"'),
      }));
    })
    .extend("theHeaderIconTargets", () => {
      const rootRoute = createRootRoute();
      const routeTree = rootRoute.addChildren(
        paths.map((path) => createRoute({ getParentRoute: () => rootRoute, path })),
      );
      const router = createRouter({
        history: createMemoryHistory({ initialEntries: ["/members"] }),
        routeTree,
      });
      const markup = renderToStaticMarkup(
        <RegistryProvider>
          <RouterContextProvider router={router}>
            <AppFrame
              collapsedMark="管理"
              footer={() => <button type="button">{"アカウント"}</button>}
              navigationId="app-navigation"
              productName="管理画面"
              sections={[
                {
                  destinations: [
                    {
                      badge: 3,
                      icon: <Icon icon={UsersIcon} />,
                      label: "利用者",
                      to: "/members",
                    },
                  ],
                  label: "運用",
                },
              ]}
              subtitle="運用コンソール"
              title="利用者の一覧"
            >
              <p>{"本文"}</p>
            </AppFrame>
          </RouterContextProvider>
        </RegistryProvider>,
      );
      return [markup].map((rendered) => ({
        badgeVisible: rendered.includes(">3<"),
        bottomTabs: bottomTabsNav.test(rendered),
        destinationLabel: rendered.includes("利用者"),
        menu: rendered.includes('aria-label="メニュー"'),
        sectionLabel: rendered.includes("運用"),
        sidebarToggle: rendered.includes('aria-label="サイドバーを畳む"'),
      }));
    })
    .extend("theCompactShell", () => {
      const rootRoute = createRootRoute();
      const routeTree = rootRoute.addChildren(
        paths.map((path) => createRoute({ getParentRoute: () => rootRoute, path })),
      );
      const router = createRouter({
        history: createMemoryHistory({ initialEntries: ["/home"] }),
        routeTree,
      });
      const markup = renderToStaticMarkup(
        <RegistryProvider>
          <RouterContextProvider router={router}>
            <AppFrame
              bottomTabs
              collapsedMark="ユーザー"
              density="compact"
              footer={() => <button type="button">{"アカウント"}</button>}
              headerLeading={<span>{"会員メニュー"}</span>}
              homeTo="/home"
              navigationId="app-navigation"
              productName="ユーザーアプリ"
              sections={[
                {
                  destinations: [
                    { exact: true, icon: <Icon icon={HomeIcon} />, label: "ホーム", to: "/home" },
                    {
                      icon: <Icon icon={SearchIcon} />,
                      label: "探す",
                      marker: "有料",
                      to: "/upgrade",
                    },
                  ],
                  label: "",
                },
              ]}
              title="ホーム"
            >
              <p>{"本文"}</p>
            </AppFrame>
          </RouterContextProvider>
        </RegistryProvider>,
      );
      return [markup].map((rendered) => {
        const tabs = rendered.slice(bottomTabsNav.exec(rendered)?.index ?? rendered.length);
        return {
          headerLeading: rendered.includes("会員メニュー"),
          homeHref: rendered.includes('href="/home"'),
          paidMarker: rendered.includes(">有料<"),
          productName: rendered.includes("ユーザーアプリ"),
          railHome: rendered.includes(">ホーム<"),
          tabsHomeAria: tabs.includes('aria-label="ホーム"'),
          tabsHomeVisible: tabs.includes(">ホーム<"),
          tabsPaidAria: tabs.includes('aria-label="探す（有料）"'),
          tabsPaidVisible: tabs.includes(">有料<"),
        };
      });
    })
    .extend("theUnreadableMark", () => {
      const rootRoute = createRootRoute();
      const routeTree = rootRoute.addChildren(
        paths.map((path) => createRoute({ getParentRoute: () => rootRoute, path })),
      );
      const router = createRouter({
        history: createMemoryHistory({ initialEntries: ["/members"] }),
        routeTree,
      });
      try {
        return renderToStaticMarkup(
          <RegistryProvider>
            <RouterContextProvider router={router}>
              <AppFrame
                collapsedMark="管"
                footer={() => <button type="button">{"アカウント"}</button>}
                navigationId="app-navigation"
                productName="管理画面"
                sections={[
                  {
                    destinations: [
                      {
                        icon: <Icon icon={UsersIcon} />,
                        label: "利用者",
                        to: "/members",
                      },
                    ],
                    label: "運用",
                  },
                ]}
                title="利用者の一覧"
              >
                <p>{"本文"}</p>
              </AppFrame>
            </RouterContextProvider>
          </RegistryProvider>,
        );
      } catch (thrown) {
        return thrown;
      }
    });

  it("names each product in the shared chrome and keeps its navigation controllable", ({
    theSharedChrome,
  }) => {
    expect(theSharedChrome).toStrictEqual([
      {
        adminHasInput: false,
        adminMark: true,
        adminProduct: true,
        adminTitle: true,
        dashboardActions: true,
        dashboardHasInput: false,
        dashboardMark: true,
        dashboardProduct: true,
        navigationControls: true,
      },
    ]);
  });

  it("offers the header icon buttons and the destinations without bottom tabs", ({
    theHeaderIconTargets,
  }) => {
    expect(theHeaderIconTargets).toStrictEqual([
      {
        badgeVisible: true,
        bottomTabs: false,
        destinationLabel: true,
        menu: true,
        sectionLabel: true,
        sidebarToggle: true,
      },
    ]);
  });

  it("keeps compact labels on the rail and icons in the bottom tabs", ({ theCompactShell }) => {
    expect(theCompactShell).toStrictEqual([
      {
        headerLeading: true,
        homeHref: true,
        paidMarker: true,
        productName: true,
        railHome: true,
        tabsHomeAria: true,
        tabsHomeVisible: false,
        tabsPaidAria: true,
        tabsPaidVisible: true,
      },
    ]);
  });

  it("refuses a one-character collapsed mark", ({ theUnreadableMark }) => {
    expect(theUnreadableMark).toStrictEqual(new Error("collapsed mark must be a readable word"));
  });
});
