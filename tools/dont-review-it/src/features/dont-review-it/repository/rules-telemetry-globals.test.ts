import { describe, expect, it } from "vite-plus/test";

import { reported } from "./lint-harness-test-fixture.ts";

const testFile = "tools/dont-review-it/src/features/dont-review-it/repository/probe.test.ts";
const fixtureFile =
  "tools/dont-review-it/src/features/dont-review-it/repository/probe-test-fixture.ts";

const clearedGlobals = [
  ["remove-all-exit-listeners", 'process.removeAllListeners("beforeExit");'],
  [
    "remove-all-imported-process-listeners",
    'import process from "node:process"; process.removeAllListeners("beforeExit");',
  ],
  ["trace-disable", 'import { trace } from "@opentelemetry/api"; trace.disable();'],
  ["context-disable", 'import { context } from "@opentelemetry/api"; context.disable();'],
  [
    "propagation-disable",
    'import { propagation } from "@opentelemetry/api"; propagation.disable();',
  ],
  ["metrics-disable", 'import { metrics } from "@opentelemetry/api"; metrics.disable();'],
  ["logs-disable", 'import { logs } from "@opentelemetry/api-logs"; logs.disable();'],
] as const;

const ownedChanges = [
  ["off-one-listener", 'process.off("beforeExit", listener);'],
  ["disable-own-instance", "const manager = makeManager(); manager.disable();"],
  [
    "register-provider",
    'import { trace } from "@opentelemetry/api"; trace.setGlobalTracerProvider(provider);',
  ],
] as const;

describe("global telemetry cleared from a spec", () => {
  it.for(clearedGlobals)(
    "rejects a spec that clears what it did not register: %s",
    ([_label, code]) => {
      expect.assertions(1);
      expect(reported("telemetry-globals", { code, filename: testFile })).toBe(true);
    },
  );

  it.for(ownedChanges)("allows a spec that touches only what it owns: %s", ([_label, code]) => {
    expect.assertions(1);
    expect(reported("telemetry-globals", { code, filename: testFile })).toBe(false);
  });

  it("leaves the fixture that sets the globals aside and hands them back alone", () => {
    expect.assertions(1);
    expect(
      reported("telemetry-globals", {
        code: 'import { trace } from "@opentelemetry/api"; trace.disable();',
        filename: fixtureFile,
      }),
    ).toBe(false);
  });
});
