import { describe, expect, it } from "vite-plus/test";

import { reported } from "./lint-harness-test-fixture.ts";

const fixtureFile = "libs/db/src/features/db/probe-test-fixture.ts";
const testFile = "libs/db/src/features/db/probe.test.ts";
const productionFile = "libs/db/src/features/db/probe.ts";

const wallClockReads = [
  ["effect-date-time", 'import { DateTime } from "effect"; export const now = DateTime.nowUnsafe();'],
  [
    "effect-date-time-module",
    'import * as DateTime from "effect/DateTime"; export const now = DateTime.nowUnsafe();',
  ],
  ["date-now", "export const now = Date.now();"],
  ["argumentless-date", "export const now = new Date();"],
  ["performance-now", "export const now = performance.now();"],
] as const;

const controlledTimes = [
  ["fixed-date", 'export const at = new Date("2026-09-20T00:00:00.000Z");'],
  [
    "effect-clock",
    'import { DateTime, Effect } from "effect"; export const now = Effect.map(DateTime.now, DateTime.toDate);',
  ],
  [
    "shadowed-date",
    "class Date { static now(): number { return 0; } } export const now = Date.now();",
  ],
  [
    "fixed-date-time",
    'import { DateTime } from "effect"; export const at = DateTime.makeUnsafe("2026-09-20T00:00:00.000Z");',
  ],
] as const;

describe("project lint rule real-clock", () => {
  it.for(wallClockReads)("rejects a spec that reads the wall clock: %s", ([_label, code]) => {
    expect.hasAssertions();
    expect(reported("real-clock", { code, filename: testFile })).toBe(true);
  });

  it.for(wallClockReads)("rejects a fixture that reads the wall clock: %s", ([_label, code]) => {
    expect.hasAssertions();
    expect(reported("real-clock", { code, filename: fixtureFile })).toBe(true);
  });

  it.for(controlledTimes)("allows a spec whose time is controlled: %s", ([_label, code]) => {
    expect.hasAssertions();
    expect(reported("real-clock", { code, filename: testFile })).toBe(false);
  });

  it.for(wallClockReads)("allows production code to read the wall clock: %s", ([_label, code]) => {
    expect.hasAssertions();
    expect(reported("real-clock", { code, filename: productionFile })).toBe(false);
  });
});
