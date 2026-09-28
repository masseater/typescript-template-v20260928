import { describe, expect, test } from "vite-plus/test";

import { filteredRunArguments, filteredRunCommand } from "./filtered-run.ts";

describe("filteredRunArguments", () => {
  const it = test.extend("argv", () =>
    filteredRunArguments("@repo/db-local", "db:bootstrap:local", "operator@example.com"),
  );

  it("fails the run when the filter matches no workspace", ({ argv }) => {
    expect(argv).toStrictEqual([
      "run",
      "--filter",
      "@repo/db-local",
      "--fail-if-no-match",
      "db:bootstrap:local",
      "operator@example.com",
    ]);
  });
});

describe("filteredRunCommand", () => {
  const it = test.extend("command", () => filteredRunCommand("@repo/dev", "setup"));

  it("spells the same failing run as a vp command line", ({ command }) => {
    expect(command).toBe("vp run --filter @repo/dev --fail-if-no-match setup");
  });
});
