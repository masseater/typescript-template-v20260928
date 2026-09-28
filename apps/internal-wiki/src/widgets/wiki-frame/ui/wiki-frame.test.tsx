import { RegistryProvider } from "@effect/atom-react";
import {
  RouterContextProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { Effect } from "effect";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";

import { WikiFrame } from "./wiki-frame.tsx";

describe("wiki header", () => {
  const it = test.extend("theWikiHeader", () =>
    Effect.runPromise(
      Effect.gen(function* loadTreeButton() {
        const root = createRootRoute();
        const index = createRoute({
          component: () => createElement("div"),
          getParentRoute: () => root,
          path: "/",
        });
        const wiki = createRoute({
          component: () => createElement("div"),
          getParentRoute: () => root,
          path: "/wiki",
        });
        const router = createRouter({
          history: createMemoryHistory({ initialEntries: ["/wiki"] }),
          routeTree: root.addChildren([index, wiki]),
        });
        yield* Effect.promise(() => router.load());
        const markup = renderToStaticMarkup(
          <RegistryProvider>
            <RouterContextProvider router={router}>
              <WikiFrame>
                <div />
              </WikiFrame>
            </RouterContextProvider>
          </RegistryProvider>,
        );
        return {
          closedTree: markup.includes('aria-label="文書の木" aria-expanded="false"'),
          dashboardLink: /<a[^>]*href="\/"[^>]*>ダッシュボード<\/a>/u.test(markup),
        };
      }),
    ));

  it("starts with the document tree closed and links back to the dashboard", ({
    theWikiHeader,
  }) => {
    expect(theWikiHeader).toStrictEqual({ closedTree: true, dashboardLink: true });
  });
});
