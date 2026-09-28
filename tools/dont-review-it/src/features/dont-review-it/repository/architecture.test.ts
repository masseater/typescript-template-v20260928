import { describe, expect, test } from "vite-plus/test";

import { architectureKindOf } from "./architecture.ts";

describe("architectureKindOf", () => {
  describe.for([
    ["apps/service-member", "fsd"],
    ["apps/service-admin", "fsd"],
    ["apps/internal-dashboard", "fsd"],
    ["apps/internal-wiki", "fsd"],
    ["apps/core", "modular"],
    ["libs/auth", "modular"],
    ["tools/dont-review-it", "modular"],
    ["infra/cloudflare", "modular"],
  ] as const)("%s", ([workspacePath, expectedArchitecture]) => {
    const it = test.extend("classifiedArchitecture", () => architectureKindOf(workspacePath));

    it(`classifies as ${expectedArchitecture}`, ({ classifiedArchitecture }) => {
      expect(classifiedArchitecture).toBe(expectedArchitecture);
    });
  });
});
