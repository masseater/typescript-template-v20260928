import { standardIoTest } from "@repo/dont-review-it";
import { Clock, Effect, Fiber, Queue, Ref } from "effect";
import { TestClock } from "effect/testing";
import { describe, expect } from "vite-plus/test";

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
import { ensureSlots, tryAcquireAny } from "./slots.ts";
import { waitingForSlot } from "./wait-for-slot.ts";

const TRIVIAL_COMMAND = ["--", process.execPath, "-e", ""];


const GAVE_UP_LINE_PATTERN = /throttle: gave up: [^\n]*\n/gu;

const RANK_LINE_PATTERN = /throttle: waiting 1\/1\n/gu;

const GAVE_UP_LINE = "throttle: gave up: every slot stayed held for the whole 400ms wait budget\n";

const EXITED_PID = 999_999_999;

describe("waitForSlot", () => {
  const throttleTest = standardIoTest.extend("slotDirectory", ({}, { onCleanup }) => {
    const temporarySlotDirectory = Effect.runPromise(
      filesystem.makeTempDirectory({ prefix: "throttle-wait-" }),
    );
    onCleanup(() =>
      Effect.runPromise(
        Effect.promise(() => temporarySlotDirectory).pipe(Effect.flatMap(removePath)),
      ),
    );
    return temporarySlotDirectory;
  }).extend("gate", ({ slotDirectory }) => {
    const location = joinPath(slotDirectory, "gate");
    return {
      command: [
        "--",
        process.execPath,
        "-e",
        `const fs = require("node:fs"); const poll = () => { if (!fs.existsSync(${JSON.stringify(location)})) setTimeout(poll, 20); }; poll();`,
      ],
      open: writeFileString({ location, written: "" }),
    };
  });

  describe("a slot held by a holder that is still alive", () => {
    const it = throttleTest
      .extend("theCodeOfARunBehindALiveHolder", ({ slotDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const pendingRun = runThrottle(TRIVIAL_COMMAND, {
              slotDir: slotDirectory,
              limit: 1,
              waitBudgetMs: 10_000,
              pollMs: 100,
              isInteractive: false,
            });
            yield* untilHolds(
              "the run waits behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 1,
              ),
            );
            yield* Effect.promise(() => hold.release());
            return yield* Effect.promise(() => pendingRun);
          }),
        ),
      )
      .extend("aLiveHolderKeepsItsSlotUntilRelease", ({ slotDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const stamp = joinPath(slotDirectory, "stamp");
            const pendingRun = runThrottle(
              [
                "--",
                process.execPath,
                "-e",
                `require("node:fs").writeFileSync(${JSON.stringify(stamp)}, "ran");`,
              ],
              {
                slotDir: slotDirectory,
                limit: 1,
                waitBudgetMs: 10_000,
                pollMs: 100,
                isInteractive: false,
              },
            );
            yield* untilHolds(
              "the run waits behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 1,
              ),
            );
            const ranBeforeRelease = yield* fileExists(stamp);
            yield* Effect.promise(() => hold.release());
            yield* Effect.promise(() => pendingRun);
            return { ranBeforeRelease, ranAfterRelease: yield* fileExists(stamp) };
          }),
        ),
      );

    it(
      "lets the waiting run through once the slot is freed",
      { timeout: 30_000 },
      ({ theCodeOfARunBehindALiveHolder }) => {
        expect(theCodeOfARunBehindALiveHolder).toBe(0);
      },
    );

    it(
      "keeps its slot until release",
      { timeout: 30_000 },
      ({ aLiveHolderKeepsItsSlotUntilRelease }) => {
        expect(aLiveHolderKeepsItsSlotUntilRelease).toStrictEqual({
          ranBeforeRelease: false,
          ranAfterRelease: true,
        });
      },
    );
  });

  describe("two runs queued behind one holder", () => {
    const it = throttleTest
      .extend("theWaiterEntryOwnersWhileTwoRunsWait", ({ slotDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const seams = {
              slotDir: slotDirectory,
              limit: 1,
              waitBudgetMs: 15_000,
              pollMs: 60,
              isInteractive: false,
            };
            const runA = runThrottle(gate.command, seams);
            yield* untilHolds(
              "the first run waits behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 1,
              ),
            );
            const runB = runThrottle(gate.command, seams);
            yield* untilHolds(
              "both runs wait behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 2,
              ),
            );
            const waiting = (yield* readDirectory(joinPath(slotDirectory, "waiters"))).map(
              (waiterFileName) => waiterFileName.split("-").at(1),
            );
            yield* Effect.promise(() => hold.release());
            yield* gate.open;
            yield* Effect.promise(() => runA);
            yield* Effect.promise(() => runB);
            return waiting;
          }),
        ),
      )
      .extend("theWaiterEntryOwnersAfterADeadEntryWasPlanted", ({ slotDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const seams = {
              slotDir: slotDirectory,
              limit: 1,
              waitBudgetMs: 15_000,
              pollMs: 60,
              isInteractive: false,
            };
            const runA = runThrottle(gate.command, seams);
            yield* untilHolds(
              "the first run waits behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 1,
              ),
            );
            const runB = runThrottle(gate.command, seams);
            yield* untilHolds(
              "both runs wait behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 2,
              ),
            );
            yield* writeFileString({
              location: joinPath(
                slotDirectory,
                "waiters",
                `0000000000000-${String(EXITED_PID)}-deadbeef`,
              ),
              written: `${String(EXITED_PID)}\n`,
            });
            yield* untilHolds(
              "the entry of the dead waiter is swept",
              Effect.map(readDirectory(joinPath(slotDirectory, "waiters")), (waiting) =>
                waiting.every((waiterFileName) => !waiterFileName.includes(String(EXITED_PID))),
              ),
            );
            const waiting = (yield* readDirectory(joinPath(slotDirectory, "waiters"))).map(
              (waiterFileName) => waiterFileName.split("-").at(1),
            );
            yield* Effect.promise(() => hold.release());
            yield* gate.open;
            yield* Effect.promise(() => runA);
            yield* Effect.promise(() => runB);
            return waiting;
          }),
        ),
      )
      .extend("theWaiterEntryOwnersAfterTheHolderReleased", ({ slotDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const seams = {
              slotDir: slotDirectory,
              limit: 1,
              waitBudgetMs: 15_000,
              pollMs: 60,
              isInteractive: false,
            };
            const runA = runThrottle(gate.command, seams);
            yield* untilHolds(
              "the first run waits behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 1,
              ),
            );
            const runB = runThrottle(gate.command, seams);
            yield* untilHolds(
              "both runs wait behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 2,
              ),
            );
            yield* Effect.promise(() => hold.release());
            yield* untilHolds(
              "the first run took the freed slot",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 1,
              ),
            );
            const waiting = (yield* readDirectory(joinPath(slotDirectory, "waiters"))).map(
              (waiterFileName) => waiterFileName.split("-").at(1),
            );
            yield* gate.open;
            yield* Effect.promise(() => runA);
            yield* Effect.promise(() => runB);
            return waiting;
          }),
        ),
      )
      .extend("theWaitersLeftOnceBothRunsFinished", ({ slotDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const seams = {
              slotDir: slotDirectory,
              limit: 1,
              waitBudgetMs: 15_000,
              pollMs: 60,
              isInteractive: false,
            };
            const runA = runThrottle(gate.command, seams);
            yield* untilHolds(
              "the first run waits behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 1,
              ),
            );
            const runB = runThrottle(gate.command, seams);
            yield* untilHolds(
              "both runs wait behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 2,
              ),
            );
            yield* Effect.promise(() => hold.release());
            yield* gate.open;
            yield* Effect.promise(() => runA);
            yield* Effect.promise(() => runB);
            return yield* readDirectory(joinPath(slotDirectory, "waiters"));
          }),
        ),
      )
      .extend("theRankOfTheSecondWaiterIsNamed", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const seams = {
              slotDir: slotDirectory,
              limit: 1,
              waitBudgetMs: 15_000,
              pollMs: 60,
              isInteractive: false,
            };
            const runA = runThrottle(gate.command, seams);
            yield* untilHolds(
              "the first run waits behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 1,
              ),
            );
            const runB = runThrottle(gate.command, seams);
            yield* untilHolds(
              "both runs wait behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 2,
              ),
            );
            yield* Effect.promise(() => hold.release());
            yield* gate.open;
            yield* Effect.promise(() => runA);
            yield* Effect.promise(() => runB);
            return stderr.text().includes("throttle: waiting 2/2\n");
          }),
        ),
      )
      .extend("theRankOfTheLastWaiterLeftIsNamed", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const seams = {
              slotDir: slotDirectory,
              limit: 1,
              waitBudgetMs: 15_000,
              pollMs: 60,
              isInteractive: false,
            };
            const runA = runThrottle(gate.command, seams);
            yield* untilHolds(
              "the first run waits behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 1,
              ),
            );
            const runB = runThrottle(gate.command, seams);
            yield* untilHolds(
              "both runs wait behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 2,
              ),
            );
            yield* Effect.promise(() => hold.release());
            yield* gate.open;
            yield* Effect.promise(() => runA);
            yield* Effect.promise(() => runB);
            return stderr.text().includes("throttle: waiting 1/1\n");
          }),
        ),
      );

    it(
      "holds one queue entry per waiting run",
      { timeout: 30_000 },
      ({ theWaiterEntryOwnersWhileTwoRunsWait }) => {
        expect(theWaiterEntryOwnersWhileTwoRunsWait).toStrictEqual([
          String(process.pid),
          String(process.pid),
        ]);
      },
    );

    it(
      "sweeps out an entry left by a dead waiter",
      { timeout: 30_000 },
      ({ theWaiterEntryOwnersAfterADeadEntryWasPlanted }) => {
        expect(theWaiterEntryOwnersAfterADeadEntryWasPlanted).toStrictEqual([
          String(process.pid),
          String(process.pid),
        ]);
      },
    );

    it(
      "shrinks the queue as each waiter takes the slot",
      { timeout: 30_000 },
      ({ theWaiterEntryOwnersAfterTheHolderReleased }) => {
        expect(theWaiterEntryOwnersAfterTheHolderReleased).toStrictEqual([String(process.pid)]);
      },
    );

    it(
      "empties the queue once every run finished",
      { timeout: 30_000 },
      ({ theWaitersLeftOnceBothRunsFinished }) => {
        expect(theWaitersLeftOnceBothRunsFinished).toStrictEqual([]);
      },
    );

    it(
      "names the rank of the run behind the other waiter",
      { timeout: 30_000 },
      ({ theRankOfTheSecondWaiterIsNamed }) => {
        expect(theRankOfTheSecondWaiterIsNamed).toBe(true);
      },
    );

    it(
      "names the closed-up rank once the queue shrank",
      { timeout: 30_000 },
      ({ theRankOfTheLastWaiterLeftIsNamed }) => {
        expect(theRankOfTheLastWaiterLeftIsNamed).toBe(true);
      },
    );
  });

  describe("a non-interactive wait that runs out of its budget", () => {
    const it = throttleTest
      .extend("theCodeOfAFirstRunThatRanOutOfBudget", ({ slotDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const code = yield* Effect.promise(() =>
              runThrottle(TRIVIAL_COMMAND, {
                slotDir: slotDirectory,
                limit: 1,
                waitBudgetMs: 400,
                pollMs: 100,
                isInteractive: false,
              }),
            );
            yield* Effect.promise(() => hold.release());
            return code;
          }),
        ),
      )
      .extend("theGaveUpReportsOfTwoRuns", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const seams = {
              slotDir: slotDirectory,
              limit: 1,
              waitBudgetMs: 400,
              pollMs: 100,
              isInteractive: false,
            };
            yield* Effect.promise(() => runThrottle(TRIVIAL_COMMAND, seams));
            yield* Effect.promise(() => runThrottle(TRIVIAL_COMMAND, seams));
            yield* Effect.promise(() => hold.release());
            return stderr.text().match(GAVE_UP_LINE_PATTERN);
          }),
        ),
      )
      .extend("theWaitersLeftAfterTheBudgetRanOut", ({ slotDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            yield* Effect.promise(() =>
              runThrottle(TRIVIAL_COMMAND, {
                slotDir: slotDirectory,
                limit: 1,
                waitBudgetMs: 400,
                pollMs: 100,
                isInteractive: false,
              }),
            );
            yield* Effect.promise(() => hold.release());
            return yield* readDirectory(joinPath(slotDirectory, "waiters"));
          }),
        ),
      )
      .extend("theCodeOfANonInteractiveWaitOutOfBudget", ({ slotDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const code = yield* Effect.promise(() =>
              runThrottle(TRIVIAL_COMMAND, {
                slotDir: slotDirectory,
                limit: 1,
                waitBudgetMs: 400,
                pollMs: 60,
                isInteractive: false,
              }),
            );
            yield* Effect.promise(() => hold.release());
            return code;
          }),
        ),
      )
      .extend("aNonInteractiveWaitOverwritesNothing", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            yield* Effect.promise(() =>
              runThrottle(TRIVIAL_COMMAND, {
                slotDir: slotDirectory,
                limit: 1,
                waitBudgetMs: 400,
                pollMs: 60,
                isInteractive: false,
              }),
            );
            yield* Effect.promise(() => hold.release());
            return stderr.text().includes("\r");
          }),
        ),
      )
      .extend("theRankLinesANonInteractiveWaitWrote", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            yield* Effect.promise(() =>
              runThrottle(TRIVIAL_COMMAND, {
                slotDir: slotDirectory,
                limit: 1,
                waitBudgetMs: 400,
                pollMs: 60,
                isInteractive: false,
              }),
            );
            yield* Effect.promise(() => hold.release());
            return stderr.text().match(RANK_LINE_PATTERN);
          }),
        ),
      );

    it(
      "is reported as a failure",
      { timeout: 10_000 },
      ({ theCodeOfAFirstRunThatRanOutOfBudget }) => {
        expect(theCodeOfAFirstRunThatRanOutOfBudget).toBe(1);
      },
    );

    it(
      "says it gave up once per run, in the same words every time",
      { timeout: 10_000 },
      ({ theGaveUpReportsOfTwoRuns }) => {
        expect(theGaveUpReportsOfTwoRuns).toStrictEqual([GAVE_UP_LINE, GAVE_UP_LINE]);
      },
    );

    it(
      "leaves no entry in the queue",
      { timeout: 10_000 },
      ({ theWaitersLeftAfterTheBudgetRanOut }) => {
        expect(theWaitersLeftAfterTheBudgetRanOut).toStrictEqual([]);
      },
    );

    it(
      "is reported as a failure under a shorter poll",
      { timeout: 10_000 },
      ({ theCodeOfANonInteractiveWaitOutOfBudget }) => {
        expect(theCodeOfANonInteractiveWaitOutOfBudget).toBe(1);
      },
    );

    it("overwrites nothing", { timeout: 10_000 }, ({ aNonInteractiveWaitOverwritesNothing }) => {
      expect(aNonInteractiveWaitOverwritesNothing).toBe(false);
    });

    it(
      "repeats nothing while the queue state stands still",
      { timeout: 10_000 },
      ({ theRankLinesANonInteractiveWaitWrote }) => {
        expect(theRankLinesANonInteractiveWaitWrote).toStrictEqual(["throttle: waiting 1/1\n"]);
      },
    );
  });

  describe("a wait whose slot never frees", () => {
    const it = throttleTest.extend("theAttemptsOfAWaitThatRanOutOfBudget", ({ slotDirectory }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          yield* ensureSlots(slotDirectory, 1);
          const attempts = yield* Queue.unbounded<number>();
          const attemptedAt = yield* Ref.make<readonly number[]>([]);
          const waiting = yield* Effect.forkChild(
            waitingForSlot(
              {
                slotDir: slotDirectory,
                limit: 1,
                waitBudgetMs: 400,
                pollMs: 100,
                interactive: false,
              },
              () =>
                Effect.gen(function* () {
                  const now = yield* Clock.currentTimeMillis;
                  yield* Ref.update(attemptedAt, (earlier) => [...earlier, now]);
                  yield* Queue.offer(attempts, now);
                  return null;
                }),
            ),
          );
          const settled = yield* Effect.repeat(
            Effect.raceFirst(
              Queue.take(attempts).pipe(
                Effect.andThen(TestClock.adjust("100 millis")),
                Effect.as(false),
              ),
              Fiber.await(waiting).pipe(Effect.as(true)),
            ),
            { until: (done: boolean) => done, times: 10 },
          );
          return {
            outcome: settled ? yield* Fiber.join(waiting) : "still waiting",
            attemptedAt: yield* Ref.get(attemptedAt),
          };
        }).pipe(Effect.provide(TestClock.layer())),
      ),
    );

    it(
      "keeps trying until the budget has passed and gives up at the attempt that reaches it",
      ({ theAttemptsOfAWaitThatRanOutOfBudget }) => {
        expect(theAttemptsOfAWaitThatRanOutOfBudget).toStrictEqual({
          outcome: "budget-exhausted",
          attemptedAt: [0, 100, 200, 300, 400],
        });
      },
    );
  });

  describe("an interactive wait", () => {
    const it = throttleTest
      .extend("theCodeOfAnInteractiveWait", ({ slotDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const pendingRun = runThrottle(TRIVIAL_COMMAND, {
              slotDir: slotDirectory,
              limit: 1,
              waitBudgetMs: 15_000,
              pollMs: 100,
              isInteractive: true,
            });
            yield* untilHolds(
              "the run waits behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 1,
              ),
            );
            yield* Effect.promise(() => hold.release());
            return yield* Effect.promise(() => pendingRun);
          }),
        ),
      )
      .extend("anInteractiveWaitOverwritesItsLine", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const pendingRun = runThrottle(TRIVIAL_COMMAND, {
              slotDir: slotDirectory,
              limit: 1,
              waitBudgetMs: 15_000,
              pollMs: 100,
              isInteractive: true,
            });
            yield* untilHolds(
              "the run waits behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 1,
              ),
            );
            yield* Effect.promise(() => hold.release());
            yield* Effect.promise(() => pendingRun);
            return stderr.text().includes("\r");
          }),
        ),
      )
      .extend("anInteractiveWaitNamesTheElapsedTime", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const pendingRun = runThrottle(TRIVIAL_COMMAND, {
              slotDir: slotDirectory,
              limit: 1,
              waitBudgetMs: 15_000,
              pollMs: 100,
              isInteractive: true,
            });
            yield* untilHolds(
              "the run waits behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 1,
              ),
            );
            yield* Effect.promise(() => hold.release());
            yield* Effect.promise(() => pendingRun);
            return stderr.text().includes("throttle: waiting 1/1 0s");
          }),
        ),
      )
      .extend("anInteractiveWaitClosesItsLine", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const pendingRun = runThrottle(TRIVIAL_COMMAND, {
              slotDir: slotDirectory,
              limit: 1,
              waitBudgetMs: 15_000,
              pollMs: 100,
              isInteractive: true,
            });
            yield* untilHolds(
              "the run waits behind the holder",
              Effect.map(
                readDirectory(joinPath(slotDirectory, "waiters")),
                (waiting) => waiting.length === 1,
              ),
            );
            yield* Effect.promise(() => hold.release());
            yield* Effect.promise(() => pendingRun);
            return stderr.text().includes("0s\n");
          }),
        ),
      );

    it("runs once the slot is freed", { timeout: 10_000 }, ({ theCodeOfAnInteractiveWait }) => {
      expect(theCodeOfAnInteractiveWait).toBe(0);
    });

    it("overwrites one line", { timeout: 10_000 }, ({ anInteractiveWaitOverwritesItsLine }) => {
      expect(anInteractiveWaitOverwritesItsLine).toBe(true);
    });

    it(
      "names the elapsed time",
      { timeout: 10_000 },
      ({ anInteractiveWaitNamesTheElapsedTime }) => {
        expect(anInteractiveWaitNamesTheElapsedTime).toBe(true);
      },
    );

    it(
      "closes the line it overwrote",
      { timeout: 10_000 },
      ({ anInteractiveWaitClosesItsLine }) => {
        expect(anInteractiveWaitClosesItsLine).toBe(true);
      },
    );
  });

  describe("an interactive wait that runs out of its budget", () => {
    const it = throttleTest
      .extend("theCodeOfAnInteractiveWaitOutOfBudget", ({ slotDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            const code = yield* Effect.promise(() =>
              runThrottle(TRIVIAL_COMMAND, {
                slotDir: slotDirectory,
                limit: 1,
                waitBudgetMs: 300,
                pollMs: 100,
                isInteractive: true,
              }),
            );
            yield* Effect.promise(() => hold.release());
            return code;
          }),
        ),
      )
      .extend("anInteractiveWaitOutOfBudgetClosesItsLine", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            yield* Effect.promise(() =>
              runThrottle(TRIVIAL_COMMAND, {
                slotDir: slotDirectory,
                limit: 1,
                waitBudgetMs: 300,
                pollMs: 100,
                isInteractive: true,
              }),
            );
            yield* Effect.promise(() => hold.release());
            return stderr.text().includes("0s\nthrottle: gave up: ");
          }),
        ),
      )
      .extend("anInteractiveWaitOutOfBudgetReportsGivingUp", ({ slotDirectory, stderr }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            yield* Effect.promise(() =>
              runThrottle(TRIVIAL_COMMAND, {
                slotDir: slotDirectory,
                limit: 1,
                waitBudgetMs: 300,
                pollMs: 100,
                isInteractive: true,
              }),
            );
            yield* Effect.promise(() => hold.release());
            return stderr.text().includes("\r") && stderr.text().includes("gave up");
          }),
        ),
      );

    it(
      "is reported as a failure",
      { timeout: 10_000 },
      ({ theCodeOfAnInteractiveWaitOutOfBudget }) => {
        expect(theCodeOfAnInteractiveWaitOutOfBudget).toBe(1);
      },
    );

    it(
      "still closes its line",
      { timeout: 10_000 },
      ({ anInteractiveWaitOutOfBudgetClosesItsLine }) => {
        expect(anInteractiveWaitOutOfBudgetClosesItsLine).toBe(true);
      },
    );

    it(
      "says it gave up",
      { timeout: 10_000 },
      ({ anInteractiveWaitOutOfBudgetReportsGivingUp }) => {
        expect(anInteractiveWaitOutOfBudgetReportsGivingUp).toBe(true);
      },
    );
  });

  describe("the two streams of a non-interactive wait that ran out of its budget", () => {
    const it = throttleTest.extend(
      "theRunBehindASlotHeldForTheWholeBudget",
      { auto: true },
      ({ slotDirectory }) =>
        Effect.runPromise(
          Effect.gen(function* () {
            yield* ensureSlots(slotDirectory, 1);
            const hold = yield* Effect.promise(() =>
              tryAcquireAny({ slotDir: slotDirectory, limit: 1 }),
            );
            if (hold === null) return yield* Effect.die("the slot was already held");
            yield* Effect.promise(() =>
              runThrottle(TRIVIAL_COMMAND, {
                slotDir: slotDirectory,
                limit: 1,
                waitBudgetMs: 400,
                pollMs: 100,
                isInteractive: false,
              }),
            );
            yield* Effect.promise(() => hold.release());
          }),
        ),
    );

    it("puts nothing on standard output", { timeout: 10_000 }, ({ stdout }) => {
      expect(stdout).toMatchInlineSnapshot(`
        {
          "chunks": [],
        }
      `);
    });

    it("puts the rank and the giving up on standard error", { timeout: 10_000 }, ({ stderr }) => {
      expect(stderr).toMatchInlineSnapshot(`
        {
          "chunks": [
            "throttle: acquiring a slot (limit 1)
        ",
            "throttle: waiting 1/1
        ",
            "throttle: gave up: every slot stayed held for the whole 400ms wait budget
        ",
          ],
        }
      `);
    });
  });
});
