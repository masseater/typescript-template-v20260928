import { APPLICATION, wikiWorker } from "@repo/config";
import { describe, expect, test } from "vite-plus/test";

import { applicationsExcept, isSecretFileName, privatePath } from "./private-path.ts";

const repositoryRoot = "/repo";

describe("privatePath", () => {
  const it = test
    .extend("foreignApplications", () => applicationsExcept(APPLICATION.user))
    .extend("privateCandidates", () =>
      [
        "infra/cloudflare/src/features/cloudflare/cli.ts",
        "tools/dev/src/features/dev/cli.ts",
        "apps/service-admin/src/entry.ts",
        "libs/db/src/features/db/admin.ts",
        "libs/db/src/features/db/agreement-admin.ts",
        "libs/db/src/features/db/trust-admin.ts",
        "libs/db/src/features/db/remote-operations.ts",
        "libs/db/src/features/db/database-test-fixture.ts",
        "@repo/db/testing",
        "@repo/db/migrations",
        ".env.local",
        "certs/app.pem",
      ].map((candidatePath) =>
        privatePath({
          application: APPLICATION.user,
          candidatePath: `${repositoryRoot}/${candidatePath}`,
          repositoryRoot,
        }),
      ),
    )
    .extend("ownApplicationEntry", () =>
      privatePath({
        application: APPLICATION.user,
        candidatePath: `${repositoryRoot}/apps/service-member/src/entry.ts`,
        repositoryRoot,
      }),
    )
    .extend("adminDatabaseModules", () =>
      ["libs/db/src/features/db/admin.ts", "libs/db/src/features/db/trust-admin.ts"].map(
        (candidatePath) =>
          privatePath({
            application: APPLICATION.admin,
            candidatePath: `${repositoryRoot}/${candidatePath}`,
            repositoryRoot,
          }),
      ),
    )
    .extend("wikiReadsOfItsHost", () =>
      ["content/docs/index.md", "src/shared/server-api/mcp.ts"].map((candidatePath) =>
        privatePath({
          application: wikiWorker,
          candidatePath: `${repositoryRoot}/apps/${APPLICATION.wiki}/${candidatePath}`,
          repositoryRoot,
        }),
      ),
    )
    .extend("devVarsFile", () => isSecretFileName(".dev.vars"))
    .extend("readmeFile", () => isSecretFileName("readme.md"));

  it("keeps the other applications off the member surface", ({ foreignApplications }) => {
    expect(foreignApplications).toStrictEqual([APPLICATION.admin, APPLICATION.wiki, wikiWorker]);
  });

  it("keeps infra, tools, secrets, and other apps off the member surface", ({
    privateCandidates,
  }) => {
    expect(privateCandidates).toStrictEqual(Array.from({ length: 12 }, () => true));
  });

  it("lets the wiki read the documents of its host and nothing else there", ({
    wikiReadsOfItsHost,
  }) => {
    expect(wikiReadsOfItsHost).toStrictEqual([false, true]);
  });

  it("lets an app read its own sources", ({ ownApplicationEntry }) => {
    expect(ownApplicationEntry).toBe(false);
  });

  it("lets admin read the admin database modules", ({ adminDatabaseModules }) => {
    expect(adminDatabaseModules).toStrictEqual([false, false]);
  });

  it("treats dev vars as a secret file", ({ devVarsFile }) => {
    expect(devVarsFile).toBe(true);
  });

  it("leaves a readme readable", ({ readmeFile }) => {
    expect(readmeFile).toBe(false);
  });
});
