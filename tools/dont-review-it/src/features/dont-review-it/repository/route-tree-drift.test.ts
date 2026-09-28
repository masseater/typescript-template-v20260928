import { Effect } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { routeTreeDrifted } from "./route-tree-drift.ts";

const committed = `import { Route as rootRouteImport } from "./routes/__root";\nimport { Route as IndexRouteImport } from "./routes/index";\n\nconst IndexRoute = IndexRouteImport.update({ id: "/", path: "/", getParentRoute: () => rootRouteImport } as any);\n`;

describe("route tree drift", () => {
  it("passes a regenerated tree that differs from the commit only in formatting", async () => {
    expect.hasAssertions();
    await expect(
      Effect.runPromise(
        routeTreeDrifted({
          committed,
          regenerated: committed.replace("{ id:", "{\n  id:").replaceAll('"', "'"),
        }),
      ),
    ).resolves.toBe(false);
  });

  it("reports a regenerated tree that carries a route the commit does not", async () => {
    expect.hasAssertions();
    await expect(
      Effect.runPromise(
        routeTreeDrifted({
          committed,
          regenerated: `${committed}import { Route as UsersRouteImport } from "./routes/users";\n`,
        }),
      ),
    ).resolves.toBe(true);
  });
});
