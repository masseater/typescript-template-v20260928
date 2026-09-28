import { standardIoTest } from "@repo/dont-review-it";
import { Effect } from "effect";
import { describe, expect, vi } from "vite-plus/test";

import { untilHolds } from "../condition-polling-test-fixture.ts";
import {
  fileExists,
  filesystem,
  joinPath,
  readDirectory,
  removePath,
  writeFileString,
} from "../host.ts";
import { runThrottle } from "./run-throttle.ts";

const TRIVIAL_COMMAND = ["--", process.execPath, "-e", ""];

const SLOT_MARKER_PATTERN = /^slot-\d+$/u;

describe("runThrottle", () => {
  const throttleTest = standardIoTest
    .extend("slotDirectory", ({}, { onCleanup }) => {
      const slotArea = Effect.runPromise(filesystem.makeTempDirectory({ prefix: "throttle-run-" }));
      onCleanup(() =>
        Effect.runPromise(Effect.promise(() => slotArea).pipe(Effect.flatMap(removePath))),
      );
      return slotArea;
    })
    .extend("stampsDirectory", ({}, { onCleanup }) => {
      const stampsArea = Effect.runPromise(
        filesystem.makeTempDirectory({ prefix: "throttle-stamps-" }),
      );
      onCleanup(() =>
        Effect.runPromise(Effect.promise(() => stampsArea).pipe(Effect.flatMap(removePath))),
      );
      return stampsArea;
    })
    .extend("gated", ({ stampsDirectory }) => {
      const gate = joinPath(stampsDirectory, "gate");
      return {
        command: (name: string): readonly string[] => [
          "--",
          process.execPath,
          "-e",
          `const fs = require("node:fs"); fs.writeFileSync(${JSON.stringify(joinPath(stampsDirectory, `${name}-start`))}, ""); const poll = () => { if (!fs.existsSync(${JSON.stringify(gate)})) setTimeout(poll, 20); }; poll();`,
        ],
        started: readDirectory(stampsDirectory).pipe(
          Effect.map((names) => names.filter((name) => name.endsWith("-start"))),
          Effect.orElseSucceed((): readonly string[] => []),
        ),
        open: writeFileString({ location: gate, written: "" }),
      };
    });

  describe("a run under every default", () => {
    const it = throttleTest
      .extend("theCodeOfARunUnderEveryDefault", ({ slotDirectory }) => {
        vi.stubEnv("MST_THROTTLE_LIMIT", undefined);
        vi.stubEnv("TMPDIR", slotDirectory);
        return runThrottle(TRIVIAL_COMMAND);
      })
      .extend("theAcquisitionNamedUnderEveryDefault", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            vi.stubEnv("MST_THROTTLE_LIMIT", undefined);
            vi.stubEnv("TMPDIR", slotDirectory);
            yield* Effect.promise(() => runThrottle(TRIVIAL_COMMAND));
            return stderr.text().includes("throttle: acquiring a slot (limit 1)");
          }),
        ),
      )
      .extend("theCommandLineNamedUnderEveryDefault", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            vi.stubEnv("MST_THROTTLE_LIMIT", undefined);
            vi.stubEnv("TMPDIR", slotDirectory);
            yield* Effect.promise(() => runThrottle(TRIVIAL_COMMAND));
            return stderr.text().includes(`throttle: run ${process.execPath} -e `);
          }),
        ),
      );

    it("succeeds", { timeout: 30_000 }, ({ theCodeOfARunUnderEveryDefault }) => {
      expect(theCodeOfARunUnderEveryDefault).toBe(0);
    });

    it(
      "announces the acquisition on stderr",
      { timeout: 30_000 },
      ({ theAcquisitionNamedUnderEveryDefault }) => {
        expect(theAcquisitionNamedUnderEveryDefault).toBe(true);
      },
    );

    it(
      "announces the command line on stderr",
      { timeout: 30_000 },
      ({ theCommandLineNamedUnderEveryDefault }) => {
        expect(theCommandLineNamedUnderEveryDefault).toBe(true);
      },
    );
  });

  describe("no command at all", () => {
    const it = throttleTest
      .extend("theCodeOfNoCommandAtAll", () => runThrottle([]))
      .extend("theUsageNamedForNoCommand", ({ stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* Effect.promise(() => runThrottle([]));
            return stderr.text().includes("Usage: throttle");
          }),
        ),
      )
      .extend("theStandardOutputOfNoCommand", ({ stdout }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* Effect.promise(() => runThrottle([]));
            return stdout.text();
          }),
        ),
      )
      .extend("theStandardErrorOfNoCommand", ({ stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* Effect.promise(() => runThrottle([]));
            return stderr.text();
          }),
        ),
      );

    it("is refused", ({ theCodeOfNoCommandAtAll }) => {
      expect(theCodeOfNoCommandAtAll).toBe(2);
    });

    it("puts the usage on stderr", ({ theUsageNamedForNoCommand }) => {
      expect(theUsageNamedForNoCommand).toBe(true);
    });

    it("puts nothing on stdout", ({ theStandardOutputOfNoCommand }) => {
      expect(theStandardOutputOfNoCommand).toMatchInlineSnapshot(`""`);
    });

    it("puts the whole refusal on stderr", ({ theStandardErrorOfNoCommand }) => {
      expect(theStandardErrorOfNoCommand).toMatchInlineSnapshot(`
        "Usage: throttle [--timeout <seconds>] -- <command> [args...]

        Runs the command while keeping the number of simultaneous executions that
        share this host and namespace at or below the limit. When every slot is held
        the wrapper joins a wait queue, reports its position on stderr, and retries
        every slot on each poll, for at most the wait budget. The operating system
        releases a slot when its holder exits, including an abrupt termination. Do
        not nest throttle inside a command it wraps: the inner call counts
        as one more competitor and consumes a second slot.

        When the command exits, throttle ends the rest of its process group before
        it gives the slot back: SIGTERM first, then SIGKILL after the grace period.

        Options:
          --timeout <seconds>  Stop the command's whole process tree after this many
                               seconds. POSIX sends SIGTERM, then SIGKILL after a short
                               grace period; Windows uses taskkill /T /F immediately.
                               0 never interrupts the command itself. Defaults to 0.

        Environment:
          MST_THROTTLE_LIMIT   Number of slots shared by every throttle on this host
                               and namespace. Invalid values (non-integer, zero or
                               less) fall back to the default of 1.

        Exit codes:
          0  the wrapped command succeeded
          1  the wrapped command failed, was killed, could not be started, ran past
             the timeout, or the wrapper could not get or release a slot
          2  throttle itself was called incorrectly
        "
      `);
    });
  });

  describe("a separator with nothing behind it", () => {
    const it = throttleTest.extend("theCodeOfASeparatorAlone", () => runThrottle(["--"]));

    it("is refused", ({ theCodeOfASeparatorAlone }) => {
      expect(theCodeOfASeparatorAlone).toBe(2);
    });
  });

  describe("a fractional timeout", () => {
    const it = throttleTest
      .extend("theCodeOfAFractionalTimeout", ({ slotDirectory }) =>
        runThrottle(["--timeout", "1.5", ...TRIVIAL_COMMAND], {
          slotDir: joinPath(slotDirectory, "slots"),
          limit: 1,
          waitBudgetMs: 15_000,
          pollMs: 50,
          isInteractive: false,
        }),
      )
      .extend("theFractionalTimeoutIsNamedBack", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* Effect.promise(() =>
              runThrottle(["--timeout", "1.5", ...TRIVIAL_COMMAND], {
                slotDir: joinPath(slotDirectory, "slots"),
                limit: 1,
                waitBudgetMs: 15_000,
                pollMs: 50,
                isInteractive: false,
              }),
            );
            return stderr.text().includes('got "1.5"');
          }),
        ),
      )
      .extend("theSlotAreaAfterARefusedTimeout", ({ slotDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* Effect.promise(() =>
              runThrottle(["--timeout", "1.5", ...TRIVIAL_COMMAND], {
                slotDir: joinPath(slotDirectory, "slots"),
                limit: 1,
                waitBudgetMs: 15_000,
                pollMs: 50,
                isInteractive: false,
              }),
            );
            return yield* fileExists(joinPath(slotDirectory, "slots"));
          }),
        ),
      );

    it("is refused", ({ theCodeOfAFractionalTimeout }) => {
      expect(theCodeOfAFractionalTimeout).toBe(2);
    });

    it("is named back on stderr", ({ theFractionalTimeoutIsNamedBack }) => {
      expect(theFractionalTimeoutIsNamedBack).toBe(true);
    });

    it("leaves no slot area behind", ({ theSlotAreaAfterARefusedTimeout }) => {
      expect(theSlotAreaAfterARefusedTimeout).toBe(false);
    });
  });

  describe("a negative timeout", () => {
    const it = throttleTest
      .extend("theCodeOfANegativeTimeout", ({ slotDirectory }) =>
        runThrottle(["--timeout=-9", ...TRIVIAL_COMMAND], {
          slotDir: joinPath(slotDirectory, "slots"),
          limit: 1,
          waitBudgetMs: 15_000,
          pollMs: 50,
          isInteractive: false,
        }),
      )
      .extend("theNegativeTimeoutIsNamedBack", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* Effect.promise(() =>
              runThrottle(["--timeout=-9", ...TRIVIAL_COMMAND], {
                slotDir: joinPath(slotDirectory, "slots"),
                limit: 1,
                waitBudgetMs: 15_000,
                pollMs: 50,
                isInteractive: false,
              }),
            );
            return stderr.text().includes('got "-9"');
          }),
        ),
      );

    it("is refused", ({ theCodeOfANegativeTimeout }) => {
      expect(theCodeOfANegativeTimeout).toBe(2);
    });

    it("is named back on stderr", ({ theNegativeTimeoutIsNamedBack }) => {
      expect(theNegativeTimeoutIsNamedBack).toBe(true);
    });
  });

  describe("an unknown option", () => {
    const it = throttleTest
      .extend("theCodeOfAnUnknownOption", () => runThrottle(["--limit", "3", ...TRIVIAL_COMMAND]))
      .extend("theUsageNamedForAnUnknownOption", ({ stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* Effect.promise(() => runThrottle(["--limit", "3", ...TRIVIAL_COMMAND]));
            return stderr.text().includes("Usage: throttle");
          }),
        ),
      );

    it("is refused", ({ theCodeOfAnUnknownOption }) => {
      expect(theCodeOfAnUnknownOption).toBe(2);
    });

    it("puts the usage on stderr", ({ theUsageNamedForAnUnknownOption }) => {
      expect(theUsageNamedForAnUnknownOption).toBe(true);
    });
  });

  describe("two runs sharing one slot", () => {
    const it = throttleTest.extend("twoRunsUnderOneSlot", ({ slotDirectory, gated, stderr }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const seams = {
            slotDir: slotDirectory,
            limit: 1,
            waitBudgetMs: 15_000,
            pollMs: 50,
            isInteractive: false,
          };
          const runs = Promise.all([
            runThrottle(gated.command("a"), seams),
            runThrottle(gated.command("b"), seams),
          ]);
          const waiting = readDirectory(joinPath(slotDirectory, "waiters")).pipe(
            Effect.orElseSucceed((): readonly string[] => []),
          );
          yield* untilHolds(
            "one run holds the slot while the other waits",
            Effect.map(Effect.all([gated.started, waiting]), ([started, waiters]) =>
              started.length > 0 && waiters.length === 1,
            ),
          );
          const startedWhileTheOtherWaited = (yield* gated.started).length;
          yield* gated.open;
          return {
            codes: yield* Effect.promise(() => runs),
            startedWhileTheOtherWaited,
            rankNamed: stderr.text().includes("throttle: waiting 1/1"),
          };
        }),
      ),
    );

    it("both run", { timeout: 20_000 }, ({ twoRunsUnderOneSlot }) => {
      expect(twoRunsUnderOneSlot.codes).toStrictEqual([0, 0]);
    });

    it("never run at the same time", { timeout: 20_000 }, ({ twoRunsUnderOneSlot }) => {
      expect(twoRunsUnderOneSlot.startedWhileTheOtherWaited).toBe(1);
    });

    it("the one that waited names its rank on stderr", { timeout: 20_000 }, ({
      twoRunsUnderOneSlot,
    }) => {
      expect(twoRunsUnderOneSlot.rankNamed).toBe(true);
    });
  });

  describe("a run finding a free slot", () => {
    const it = throttleTest
      .extend("theCodeOfARunTakingAFreeSlot", ({ slotDirectory }) =>
        runThrottle(TRIVIAL_COMMAND, {
          slotDir: slotDirectory,
          limit: 1,
          waitBudgetMs: 15_000,
          pollMs: 30_000,
          isInteractive: false,
        }),
      )
      .extend("theWaitingNamedWhileTakingAFreeSlot", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* Effect.promise(() =>
              runThrottle(TRIVIAL_COMMAND, {
                slotDir: slotDirectory,
                limit: 1,
                waitBudgetMs: 15_000,
                pollMs: 30_000,
                isInteractive: false,
              }),
            );
            return stderr.text().includes("waiting");
          }),
        ),
      );

    it("runs the command", { timeout: 30_000 }, ({ theCodeOfARunTakingAFreeSlot }) => {
      expect(theCodeOfARunTakingAFreeSlot).toBe(0);
    });

    it(
      "puts no waiting output on stderr",
      { timeout: 30_000 },
      ({ theWaitingNamedWhileTakingAFreeSlot }) => {
        expect(theWaitingNamedWhileTakingAFreeSlot).toBe(false);
      },
    );
  });

  describe("two runs in different namespaces", () => {
    const it = throttleTest.extend("twoRunsInDifferentNamespaces", ({ slotDirectory, gated }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const runs = Promise.all(
            ["a", "b"].map((namespace) =>
              runThrottle(gated.command(namespace), {
                slotDir: joinPath(slotDirectory, namespace),
                limit: 1,
                waitBudgetMs: 15_000,
                pollMs: 50,
                isInteractive: false,
              }),
            ),
          );
          yield* untilHolds(
            "both runs started before either could finish",
            Effect.map(gated.started, (started) => started.length === 2),
          );
          yield* gated.open;
          return { codes: yield* Effect.promise(() => runs) };
        }),
      ),
    );

    it("both run at the same time", { timeout: 30_000 }, ({ twoRunsInDifferentNamespaces }) => {
      expect(twoRunsInDifferentNamespaces.codes).toStrictEqual([0, 0]);
    });
  });

  describe("three runs under an environment limit of two", () => {
    const it = throttleTest.extend("threeRunsUnderTwoSlots", ({ slotDirectory, gated }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          vi.stubEnv("MST_THROTTLE_LIMIT", "2");
          const seams = {
            slotDir: slotDirectory,
            waitBudgetMs: 15_000,
            pollMs: 50,
            isInteractive: false,
          };
          const runs = Promise.all(
            ["a", "b", "c"].map((name) => runThrottle(gated.command(name), seams)),
          );
          const waiting = readDirectory(joinPath(slotDirectory, "waiters")).pipe(
            Effect.orElseSucceed((): readonly string[] => []),
          );
          yield* untilHolds(
            "two runs hold the slots while the third waits",
            Effect.map(Effect.all([gated.started, waiting]), ([started, waiters]) =>
              started.length === 2 && waiters.length === 1,
            ),
          );
          const startedWhileTheThirdWaited = (yield* gated.started).length;
          yield* gated.open;
          return {
            codes: yield* Effect.promise(() => runs),
            startedWhileTheThirdWaited,
          };
        }),
      ),
    );

    it("every run finishes", { timeout: 30_000 }, ({ threeRunsUnderTwoSlots }) => {
      expect(threeRunsUnderTwoSlots.codes).toStrictEqual([0, 0, 0]);
    });

    it("two really run at a time", { timeout: 30_000 }, ({ threeRunsUnderTwoSlots }) => {
      expect(threeRunsUnderTwoSlots.startedWhileTheThirdWaited).toBe(2);
    });
  });

  describe("an environment limit of two", () => {
    const it = throttleTest.extend(
      "theSecondSlotMarkerUnderALimitOfTwo",
      ({ slotDirectory, stampsDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            vi.stubEnv("MST_THROTTLE_LIMIT", "2");
            yield* Effect.promise(() =>
              runThrottle(
                [
                  "--",
                  process.execPath,
                  "-e",
                  `const { writeFileSync } = require("node:fs"); writeFileSync("${joinPath(stampsDirectory, "a-start")}", String(Date.now()));`,
                ],
                {
                  slotDir: slotDirectory,
                  waitBudgetMs: 15_000,
                  pollMs: 50,
                  isInteractive: false,
                },
              ),
            );
            return yield* fileExists(joinPath(slotDirectory, "slot-1"));
          }),
        ),
    );

    it(
      "creates the second slot marker",
      { timeout: 30_000 },
      ({ theSecondSlotMarkerUnderALimitOfTwo }) => {
        expect(theSecondSlotMarkerUnderALimitOfTwo).toBe(true);
      },
    );
  });

  describe("a worded environment limit", () => {
    const it = throttleTest
      .extend("theCodeOfARunUnderAWordedLimit", ({ slotDirectory }) => {
        vi.stubEnv("MST_THROTTLE_LIMIT", "abc");
        return runThrottle(TRIVIAL_COMMAND, {
          slotDir: slotDirectory,
          waitBudgetMs: 5000,
          pollMs: 1000,
          isInteractive: false,
        });
      })
      .extend("theMarkersUnderAWordedLimit", ({ slotDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            vi.stubEnv("MST_THROTTLE_LIMIT", "abc");
            yield* Effect.promise(() =>
              runThrottle(TRIVIAL_COMMAND, {
                slotDir: slotDirectory,
                waitBudgetMs: 5000,
                pollMs: 1000,
                isInteractive: false,
              }),
            );
            return (yield* readDirectory(slotDirectory)).filter((slotFileName) =>
              SLOT_MARKER_PATTERN.test(slotFileName),
            );
          }),
        ),
      );

    it("does not fail the run", { timeout: 30_000 }, ({ theCodeOfARunUnderAWordedLimit }) => {
      expect(theCodeOfARunUnderAWordedLimit).toBe(0);
    });

    it("falls back to one slot", { timeout: 30_000 }, ({ theMarkersUnderAWordedLimit }) => {
      expect(theMarkersUnderAWordedLimit).toStrictEqual(["slot-0"]);
    });
  });

  describe("an environment limit of zero", () => {
    const it = throttleTest.extend("theMarkersUnderALimitOfZero", ({ slotDirectory }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          vi.stubEnv("MST_THROTTLE_LIMIT", "0");
          yield* Effect.promise(() =>
            runThrottle(TRIVIAL_COMMAND, {
              slotDir: slotDirectory,
              waitBudgetMs: 5000,
              pollMs: 1000,
              isInteractive: false,
            }),
          );
          return (yield* readDirectory(slotDirectory)).filter((slotFileName) =>
            SLOT_MARKER_PATTERN.test(slotFileName),
          );
        }),
      ),
    );

    it("falls back to one slot", { timeout: 30_000 }, ({ theMarkersUnderALimitOfZero }) => {
      expect(theMarkersUnderALimitOfZero).toStrictEqual(["slot-0"]);
    });
  });

  describe("a negative environment limit", () => {
    const it = throttleTest.extend("theMarkersUnderANegativeLimit", ({ slotDirectory }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          vi.stubEnv("MST_THROTTLE_LIMIT", "-3");
          yield* Effect.promise(() =>
            runThrottle(TRIVIAL_COMMAND, {
              slotDir: slotDirectory,
              waitBudgetMs: 5000,
              pollMs: 1000,
              isInteractive: false,
            }),
          );
          return (yield* readDirectory(slotDirectory)).filter((slotFileName) =>
            SLOT_MARKER_PATTERN.test(slotFileName),
          );
        }),
      ),
    );

    it("falls back to one slot", { timeout: 30_000 }, ({ theMarkersUnderANegativeLimit }) => {
      expect(theMarkersUnderANegativeLimit).toStrictEqual(["slot-0"]);
    });
  });

  describe("an unusable slot area", () => {
    const it = throttleTest
      .extend("theCodeOfAnUnusableSlotArea", ({ slotDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            const plainFile = joinPath(slotDirectory, "plain-file");
            yield* writeFileString({ location: plainFile, written: "" });
            return yield* Effect.promise(() =>
              runThrottle(TRIVIAL_COMMAND, {
                slotDir: joinPath(plainFile, "nested"),
                limit: 1,
                waitBudgetMs: 15_000,
                pollMs: 50,
                isInteractive: false,
              }),
            );
          }),
        ),
      )
      .extend("theFailureNamedForAnUnusableSlotArea", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            const plainFile = joinPath(slotDirectory, "plain-file");
            yield* writeFileString({ location: plainFile, written: "" });
            yield* Effect.promise(() =>
              runThrottle(TRIVIAL_COMMAND, {
                slotDir: joinPath(plainFile, "nested"),
                limit: 1,
                waitBudgetMs: 15_000,
                pollMs: 50,
                isInteractive: false,
              }),
            );
            return stderr.text().includes("throttle: ");
          }),
        ),
      )
      .extend("theUsageNamedForAnUnusableSlotArea", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            const plainFile = joinPath(slotDirectory, "plain-file");
            yield* writeFileString({ location: plainFile, written: "" });
            yield* Effect.promise(() =>
              runThrottle(TRIVIAL_COMMAND, {
                slotDir: joinPath(plainFile, "nested"),
                limit: 1,
                waitBudgetMs: 15_000,
                pollMs: 50,
                isInteractive: false,
              }),
            );
            return stderr.text().includes("Usage: throttle");
          }),
        ),
      );

    it("fails the run", ({ theCodeOfAnUnusableSlotArea }) => {
      expect(theCodeOfAnUnusableSlotArea).toBe(1);
    });

    it("is reported as a throttle failure", ({ theFailureNamedForAnUnusableSlotArea }) => {
      expect(theFailureNamedForAnUnusableSlotArea).toBe(true);
    });

    it("is not reported as misuse", ({ theUsageNamedForAnUnusableSlotArea }) => {
      expect(theUsageNamedForAnUnusableSlotArea).toBe(false);
    });
  });
});
