import { describe, expect, it } from "vite-plus/test";

import { reported } from "./lint-harness-test-fixture.ts";

const fixtureFile = "libs/db/src/features/db/probe-test-fixture.ts";
const testFile = "libs/db/src/features/db/probe.test.ts";
const productionFile = "libs/db/src/features/db/probe.ts";

const fixedWaits = [
  ["effect-sleep", 'import { Effect } from "effect"; export const waited = Effect.sleep("200 millis");'],
  [
    "effect-sleep-module",
    'import * as Effect from "effect/Effect"; export const waited = Effect.sleep("200 millis");',
  ],
  [
    "global-set-timeout",
    "export const waited = new Promise((resolve) => setTimeout(resolve, 200));",
  ],
  [
    "global-this-set-timeout",
    "export const waited = new Promise((resolve) => globalThis.setTimeout(resolve, 200));",
  ],
  ["set-interval", "export const ticking = setInterval(() => undefined, 200);"],
  [
    "timers-promises",
    'import { setTimeout } from "node:timers/promises"; export const waited = setTimeout(200);',
  ],
] as const;

const conditionedWaits = [
  [
    "scheduled-poll",
    'import { Effect, Schedule } from "effect"; export const polled = Effect.succeed(true).pipe(Effect.repeat({ until: (held) => held, schedule: Schedule.spaced("20 millis") }));',
  ],
  [
    "wait-until",
    'import { vi } from "vite-plus/test"; export const polled = vi.waitUntil(() => true, { interval: 20 });',
  ],
  ["child-script", 'export const script = "setTimeout(poll, 20);";'],
  [
    "shadowed-set-timeout",
    "const setTimeout = (run: () => void): void => run(); export const ran = setTimeout(() => undefined);",
  ],
] as const;

describe("project lint rule fixed-sleep", () => {
  it.for(fixedWaits)("rejects a spec that waits a fixed time: %s", ([_label, code]) => {
    expect.hasAssertions();
    expect(reported("fixed-sleep", { code, filename: testFile })).toBe(true);
  });

  it.for(fixedWaits)("rejects a fixture that waits a fixed time: %s", ([_label, code]) => {
    expect.hasAssertions();
    expect(reported("fixed-sleep", { code, filename: fixtureFile })).toBe(true);
  });

  it.for(conditionedWaits)("allows a spec that waits on a condition: %s", ([_label, code]) => {
    expect.hasAssertions();
    expect(reported("fixed-sleep", { code, filename: testFile })).toBe(false);
  });

  it.for(fixedWaits)("allows production code to wait a fixed time: %s", ([_label, code]) => {
    expect.hasAssertions();
    expect(reported("fixed-sleep", { code, filename: productionFile })).toBe(false);
  });
});
