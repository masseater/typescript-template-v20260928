import { ROLE } from "@repo/config";
import { describe, expect, test } from "vite-plus/test";

import { sessionAdmission } from "./session-redirect.ts";

const strongMember = { strong: true, user: { role: ROLE.member } } as const;
const weakAdministrator = { strong: false, user: { role: ROLE.administrator } } as const;
const wikiPage = { href: "/wiki", pathname: "/wiki", role: undefined, securityExempt: false };
const nestedWikiPage = { ...wikiPage, href: "/wiki/a?b=1", pathname: "/wiki/a" };
const exemptSecurityPage = {
  href: "/security",
  pathname: "/security",
  role: ROLE.administrator,
  securityExempt: true,
};
const guardedSecurityPage = { ...exemptSecurityPage, role: undefined, securityExempt: false };
const administratorPage = { ...exemptSecurityPage, href: "/users", pathname: "/users" };

describe("session admission", () => {
  const it = test
    .extend("theRedirectOfAStrongSession", () => sessionAdmission(strongMember, wikiPage))
    .extend("theRedirectOfAWeakSession", () => sessionAdmission(weakAdministrator, wikiPage))
    .extend("theRedirectOfASignedOutVisitor", () => sessionAdmission(null, nestedWikiPage))
    .extend("theRedirectOfAWeakSessionOnAnExemptSecurityPage", () =>
      sessionAdmission(weakAdministrator, exemptSecurityPage),
    )
    .extend("theRedirectOfAWeakSessionOnAGuardedSecurityPage", () =>
      sessionAdmission(weakAdministrator, guardedSecurityPage),
    )
    .extend("theRedirectOfASignedOutVisitorOnTheSecurityPage", () =>
      sessionAdmission(null, exemptSecurityPage),
    )
    .extend("theRedirectOfAStrongSessionWithoutTheRole", () =>
      sessionAdmission(strongMember, administratorPage),
    );

  it("stays for a strong session without a role requirement", ({ theRedirectOfAStrongSession }) => {
    expect(theRedirectOfAStrongSession).toStrictEqual({ admitted: strongMember });
  });

  it("sends a weak session to the security page", ({ theRedirectOfAWeakSession }) => {
    expect(theRedirectOfAWeakSession).toStrictEqual({ destination: "/security" });
  });

  it("sends a signed-out visitor to the login page for the current address", ({
    theRedirectOfASignedOutVisitor,
  }) => {
    expect(theRedirectOfASignedOutVisitor).toStrictEqual({
      destination: "/login?redirect=%2Fwiki%2Fa%3Fb%3D1",
    });
  });

  it("lets a weak session stay on the security page when it is exempt", ({
    theRedirectOfAWeakSessionOnAnExemptSecurityPage,
  }) => {
    expect(theRedirectOfAWeakSessionOnAnExemptSecurityPage).toStrictEqual({
      admitted: weakAdministrator,
    });
  });

  it("sends a weak session away from the security page when it is not exempt", ({
    theRedirectOfAWeakSessionOnAGuardedSecurityPage,
  }) => {
    expect(theRedirectOfAWeakSessionOnAGuardedSecurityPage).toStrictEqual({
      destination: "/security",
    });
  });

  it("sends a signed-out visitor on the security page to the login page", ({
    theRedirectOfASignedOutVisitorOnTheSecurityPage,
  }) => {
    expect(theRedirectOfASignedOutVisitorOnTheSecurityPage).toStrictEqual({
      destination: "/login?redirect=%2Fsecurity",
    });
  });

  it("sends a strong session without the required role to the security page", ({
    theRedirectOfAStrongSessionWithoutTheRole,
  }) => {
    expect(theRedirectOfAStrongSessionWithoutTheRole).toStrictEqual({ destination: "/security" });
  });
});
