import { ROLE } from "@repo/config";
import { QueryClient } from "@tanstack/react-query";
import { isRedirect } from "@tanstack/react-router";
import { Effect } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { provideSessionLoader } from "./api/session.ts";
import { enterSessionFrame } from "./session-frame.ts";

import type { QueryClient as Queries } from "@tanstack/react-query";
import type { SessionView } from "./protocol.ts";

const administrator: SessionView["user"] = {
  email: "a@example.com",
  id: "user-a",
  name: "A",
  permission: null,
  role: ROLE.administrator,
  twoFactorEnabled: true,
};

const adminVisit = {
  href: "/users?page=2",
  pathname: "/users",
  reloadDocument: false,
  role: ROLE.administrator,
  securityExempt: true,
} as const;

const wikiVisit = {
  href: "/wiki/a",
  pathname: "/wiki/a",
  reloadDocument: true,
  role: undefined,
  securityExempt: false,
} as const;

const frameOrRedirect = (
  queries: Queries,
  visit: Parameters<typeof enterSessionFrame>[1],
): Promise<unknown> =>
  Effect.runPromise(
    Effect.tryPromise({
      catch: (thrown) => thrown,
      try: () => enterSessionFrame(queries, visit),
    }).pipe(
      Effect.match({
        onFailure: (thrown) => (isRedirect(thrown) ? thrown.options : thrown),
        onSuccess: (frame) => frame,
      }),
    ),
  );

describe("session frame", () => {
  const it = test
    .extend("theFrameOfAStrongAdministrator", () => {
      const queries = new QueryClient();
      provideSessionLoader(queries, () => Promise.resolve({ strong: true, user: administrator }));
      return frameOrRedirect(queries, adminVisit);
    })
    .extend("theFrameOfASignedOutVisitor", () => {
      const queries = new QueryClient();
      provideSessionLoader(queries, () => Promise.resolve(undefined));
      return frameOrRedirect(queries, adminVisit);
    })
    .extend("theWikiFrameOfAWeakSession", () => {
      const queries = new QueryClient();
      provideSessionLoader(queries, () => Promise.resolve({ strong: false, user: administrator }));
      return frameOrRedirect(queries, wikiVisit);
    });

  it("passes an admitted session to the child routes", ({ theFrameOfAStrongAdministrator }) => {
    expect(theFrameOfAStrongAdministrator).toStrictEqual({
      session: { strong: true, user: administrator },
    });
  });

  it("redirects a signed-out visitor to the login page before the child routes load", ({
    theFrameOfASignedOutVisitor,
  }) => {
    expect(theFrameOfASignedOutVisitor).toStrictEqual({
      href: "/login?redirect=%2Fusers%3Fpage%3D2",
      reloadDocument: false,
      replace: true,
      statusCode: 307,
    });
  });

  it("reloads the document into the security page for the wiki", ({
    theWikiFrameOfAWeakSession,
  }) => {
    expect(theWikiFrameOfAWeakSession).toStrictEqual({
      href: "/security",
      reloadDocument: true,
      replace: true,
      statusCode: 307,
    });
  });
});
