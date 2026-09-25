import { NodeServices } from "@effect/platform-node";
import { APPLICATION, wikiWorker } from "@repo/config";
import { Effect, FileSystem, Path } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { repositoryRoot } from "./repository-root.ts";
import {
  appRoutes,
  documentUrls,
  undocumentedScreens,
  unroutedUrls,
  type AppRoute,
  type DocumentUrls,
} from "./wiki-page-urls.ts";

const memberRoutes: readonly AppRoute[] = [
  { fullPath: "/", kind: "screen" },
  { fullPath: "/api/$", kind: "server" },
  { fullPath: "/messages/$id", kind: "screen" },
  { fullPath: "/messages/new", kind: "screen" },
  { fullPath: "/welcome/", kind: "redirect" },
  { fullPath: "/welcome/choose", kind: "screen" },
];

const dashboardRoutes: readonly AppRoute[] = [
  { fullPath: "/$", kind: "redirect" },
  { fullPath: "/inquiries", kind: "screen" },
  { fullPath: "/recordings/", kind: "screen" },
  { fullPath: "/recordings/$id", kind: "screen" },
  { fullPath: "/wiki-edit/$", kind: "screen" },
];

describe("reading URLs from a wiki page", () => {
  it("collects the inline code that starts with a slash and leaves diagrams and prose alone", () => {
    expect(
      documentUrls(
        "# Page\n\nOpen `/messages/{id}` or `messages`.\n\n```mermaid\nflowchart LR\n  A[/recover]\n```\n\n/recover\n",
      ),
    ).toStrictEqual(["/messages/{id}"]);
  });
});

describe("matching documented URLs to routes", () => {
  it("reports URLs no route serves", () => {
    const documents: readonly DocumentUrls[] = [
      { file: "pages/member-layout.md", urls: ["/recover", "/messages/{id}", "/welcome?step=1"] },
    ];
    expect(unroutedUrls(documents, memberRoutes)).toStrictEqual([
      "pages/member-layout.md: /recover",
    ]);
  });

  it("does not let a catch-all route or a server route stand for a named page", () => {
    expect(
      unroutedUrls(
        [{ file: "pages/internal-dashboard-layout.md", urls: ["/inquiries/{id}", "/api/keys"] }],
        [...dashboardRoutes, { fullPath: "/api/$", kind: "server" }],
      ),
    ).toStrictEqual([
      "pages/internal-dashboard-layout.md: /inquiries/{id}",
      "pages/internal-dashboard-layout.md: /api/keys",
    ]);
  });

  it("lets a server route with a fixed path stand for its URL", () => {
    expect(
      unroutedUrls(
        [{ file: "pages/admin-admins.md", urls: ["/mcp"] }],
        [{ fullPath: "/mcp", kind: "server" }],
      ),
    ).toStrictEqual([]);
  });

  it("lets a placeholder fill a catch-all route", () => {
    expect(
      unroutedUrls(
        [{ file: "pages/internal-dashboard-layout.md", urls: ["/wiki-edit/{文書のパス}"] }],
        dashboardRoutes,
      ),
    ).toStrictEqual([]);
  });

  it("reports screens no page mentions", () => {
    expect(
      undocumentedScreens(
        [{ file: "pages/internal-dashboard-layout.md", urls: ["/inquiries"] }],
        dashboardRoutes,
      ),
    ).toStrictEqual(["/recordings/", "/recordings/$id", "/wiki-edit/$"]);
    expect(
      undocumentedScreens(
        [{ file: "pages/member-messages.md", urls: ["/", "/messages/{id}", "/welcome/choose"] }],
        memberRoutes,
      ),
    ).toStrictEqual(["/messages/new"]);
  });
});

const documentedApplications = [
  { applications: [APPLICATION.user], prefix: "member-" },
  { applications: [APPLICATION.admin], prefix: "admin-" },
  { applications: [APPLICATION.wiki, wikiWorker], prefix: "internal-dashboard-" },
] as const;

const docsRoot = "apps/internal-dashboard/content/docs";

const repositoryDocuments = (directory: string) =>
  Effect.gen(function* readDocuments() {
    const filesystem = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const absolute = paths.join(repositoryRoot, docsRoot, directory);
    const names = (yield* filesystem.readDirectory(absolute)).filter((name) =>
      name.endsWith(".md"),
    );
    return yield* Effect.forEach(names.toSorted(), (name) =>
      Effect.map(filesystem.readFileString(paths.join(absolute, name)), (markdown) => ({
        file: `${directory}/${name}`,
        name,
        urls: documentUrls(markdown),
      })),
    );
  });

const routesOf = (applications: readonly string[]) =>
  Effect.gen(function* readRoutes() {
    const paths = yield* Path.Path;
    const routes = yield* Effect.forEach(applications, (application) =>
      appRoutes(paths.join(repositoryRoot, "apps", application)),
    );
    return routes.flat();
  });

describe("wiki pages and the routers", () => {
  it("name only URLs the routers serve and every screen the routers serve", () =>
    Effect.runPromise(
      Effect.gen(function* compare() {
        const pages = yield* repositoryDocuments("pages");
        const dataModel = yield* repositoryDocuments("data-model");
        const perApplication = yield* Effect.forEach(
          documentedApplications,
          ({ applications, prefix }) =>
            Effect.map(routesOf(applications), (routes) => {
              const documents = pages.filter((page) => page.name.startsWith(prefix));
              return {
                undocumented: undocumentedScreens(documents, routes).map(
                  (fullPath) => `${applications[0]}: ${fullPath}`,
                ),
                unrouted: unroutedUrls(documents, routes),
              };
            }),
        );
        const allRoutes = yield* routesOf(
          documentedApplications.flatMap(({ applications }) => applications),
        );
        expect({
          undocumented: perApplication.flatMap((result) => result.undocumented),
          unprefixed: pages
            .filter(
              (page) => !documentedApplications.some(({ prefix }) => page.name.startsWith(prefix)),
            )
            .map((page) => page.file),
          unrouted: [
            ...perApplication.flatMap((result) => result.unrouted),
            ...unroutedUrls(dataModel, allRoutes),
          ],
        }).toStrictEqual({ undocumented: [], unprefixed: [], unrouted: [] });
      }).pipe(Effect.provide(NodeServices.layer)),
    ));
});
