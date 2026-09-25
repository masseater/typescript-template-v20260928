import { Effect, Result } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { describe, expect, it } from "vite-plus/test";

import { layer } from "./platform.ts";
import { descendantPids, killQuietly, processRows, readProcessTable } from "./process-tree.ts";

const idleScript = "setInterval(() => undefined, 1000);";

describe("reading the process table", () => {
  it("pairs each process with its parent and skips the kernel's process 0", () => {
    expect(processRows("  12     1\n  30    12\n   0     0\n")).toStrictEqual(
      Result.succeed([
        [1, 12],
        [12, 30],
      ]),
    );
  });

  it("refuses a table with a row that is not a process", () => {
    expect(processRows("  PID  PPID\n  12     1\n")).toStrictEqual(
      Result.fail("unreadable process table row:   PID  PPID"),
    );
  });

  it("finds this test's own process in the live table", () =>
    Effect.runPromise(
      readProcessTable().pipe(
        Effect.map((rows) => {
          expect(rows).toContainEqual([process.ppid, process.pid]);
        }),
        Effect.provide(layer),
      ),
    ));

  it("fails with what ps printed when ps rejects its arguments", () =>
    Effect.runPromise(
      Effect.flip(readProcessTable(["-o", "no-such-column="])).pipe(
        Effect.map((unreadable) => {
          expect(unreadable.reason).toMatch(/^ps exited with [1-9]\d*: \S/u);
        }),
        Effect.provide(layer),
      ),
    ));
});

describe("walking the descendants of a process", () => {
  it("collects children and grandchildren but not siblings of the root", () => {
    expect(
      descendantPids(10, [
        [1, 10],
        [10, 11],
        [10, 12],
        [11, 13],
        [1, 20],
        [20, 21],
      ]).toSorted((left, right) => left - right),
    ).toStrictEqual([11, 12, 13]);
  });

  it("visits a process listed twice only once", () => {
    expect(
      descendantPids(1, [
        [1, 2],
        [2, 3],
        [1, 3],
      ]).toSorted((left, right) => left - right),
    ).toStrictEqual([2, 3]);
  });

  it("finds nothing under a process without children", () => {
    expect(descendantPids(5, [[1, 5]])).toStrictEqual([]);
  });
});

describe("killing a process quietly", () => {
  it("stops a running process and ignores it once it is gone", () =>
    Effect.runPromise(
      Effect.gen(function* program() {
        expect.hasAssertions();
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
        const handle = yield* spawner.spawn(
          ChildProcess.make(process.execPath, ["-e", idleScript], {
            stderr: "ignore",
            stdin: "ignore",
            stdout: "ignore",
          }),
        );
        killQuietly(handle.pid);
        yield* handle.exitCode.pipe(Effect.ignore);
        expect(yield* handle.isRunning).toBe(false);
        expect(() => {
          killQuietly(handle.pid);
        }).not.toThrow();
      }).pipe(Effect.scoped, Effect.provide(layer)),
    ));

  it("rethrows a refusal other than a missing process", () => {
    expect(() => {
      killQuietly(Number.NaN);
    }).toThrow(TypeError);
  });
});
