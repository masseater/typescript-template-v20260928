import { Effect, Redacted } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { parseErrorMonitorConfig } from "./config.ts";

const ACCOUNT_ID_LENGTH = 32;
const TOKEN_LENGTH = 40;

const valid = {
  CLOUDFLARE_ACCOUNT_ID: "a".repeat(ACCOUNT_ID_LENGTH),
  OBSERVABILITY_TOKEN: "t".repeat(TOKEN_LENGTH),
} as const;

describe("parseErrorMonitorConfig", () => {
  const it = test.extend("acceptedConfig", () =>
    Effect.runPromise(
      parseErrorMonitorConfig(valid).pipe(
        Effect.map((config) => ({
          ...config,
          OBSERVABILITY_TOKEN: Redacted.value(config.OBSERVABILITY_TOKEN),
        })),
      ),
    ));

  it("accepts a scoped token", ({ acceptedConfig }) => {
    expect(acceptedConfig).toStrictEqual(valid);
  });
});

describe.for([
  [{ CLOUDFLARE_ACCOUNT_ID: "private-not-an-account" }],
  [{ OBSERVABILITY_TOKEN: "short" }],
] as const)("invalid settings %s", ([override]) => {
  const it = test.extend("reportedFailure", () =>
    Effect.runPromise(
      parseErrorMonitorConfig({ ...valid, ...override }).pipe(
        Effect.flip,
        Effect.map(({ code, keys }) => ({ code, keys })),
      ),
    ));

  it("refuses without echoing the invalid value", ({ reportedFailure }) => {
    expect(reportedFailure).toStrictEqual({ code: "error_monitor_config_invalid", keys: [] });
  });
});
