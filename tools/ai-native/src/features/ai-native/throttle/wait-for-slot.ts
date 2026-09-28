import { Clock, Effect } from "effect";

import { baseName } from "../host.ts";
import {
  dropInterruptHandler,
  installInterruptHandler,
  makeWaitingInterruptHandler,
} from "./signals.ts";
import {
  removeWaiter,
  reserveWaiterPath,
  slotStateFingerprint,
  sweepWaiters,
  tryAcquireAny,
  writeWaiterEntry,
  type AcquireConfiguration,
  type SlotHold,
} from "./slots.ts";

export type WaitConfiguration = AcquireConfiguration & {
  waitBudgetMs: number;
  pollMs: number;
  interactive: boolean;
};

type SlotAttempt = (configuration: AcquireConfiguration) => Effect.Effect<SlotHold | null>;

type PollState = {
  entryName: string;
  startedAt: number;
  lastPrinted: string;
};

const MILLISECONDS_PER_SECOND = 1000;

const elapsedSince = (startedAt: number): Effect.Effect<number> =>
  Effect.map(Clock.currentTimeMillis, (now) => now - startedAt);

const reportProgress = (
  configuration: WaitConfiguration,
  held: PollState,
): Effect.Effect<string, Error> =>
  Effect.gen(function* printPosition() {
    const waiting = yield* sweepWaiters(configuration.slotDir);
    const line = `throttle: waiting ${waiting.indexOf(held.entryName) + 1}/${waiting.length}`;
    if (configuration.interactive) {
      const elapsedSec = Math.floor((yield* elapsedSince(held.startedAt)) / MILLISECONDS_PER_SECOND);
      process.stderr.write(`\r\u001B[K${line} ${elapsedSec}s`);
      return held.lastPrinted;
    }
    const fingerprint = yield* slotStateFingerprint(configuration.slotDir, configuration.limit);
    const printKey = `${line}|${fingerprint}`;
    if (printKey !== held.lastPrinted) process.stderr.write(`${line}\n`);
    return printKey;
  });

const closeProgressLine = (configuration: WaitConfiguration): void => {
  if (configuration.interactive) process.stderr.write("\n");
};

const budgetExhausted = (configuration: WaitConfiguration): "budget-exhausted" => {
  closeProgressLine(configuration);
  process.stderr.write(
    `throttle: gave up: every slot stayed held for the whole ${configuration.waitBudgetMs}ms wait budget\n`,
  );
  return "budget-exhausted";
};

const pollForSlot = (
  wait: { readonly configuration: WaitConfiguration; readonly attempt: SlotAttempt },
  held: PollState,
): Effect.Effect<SlotHold | "budget-exhausted", Error> =>
  Effect.gen(function* pollHeldSlot() {
    const lastPrinted = yield* reportProgress(wait.configuration, held);
    const hold = yield* wait.attempt(wait.configuration);
    if (hold !== null) {
      closeProgressLine(wait.configuration);
      return hold;
    }
    if ((yield* elapsedSince(held.startedAt)) >= wait.configuration.waitBudgetMs) {
      return budgetExhausted(wait.configuration);
    }
    yield* Effect.sleep(`${wait.configuration.pollMs} millis`);
    return yield* pollForSlot(wait, { ...held, lastPrinted });
  });

const attemptOnDisk: SlotAttempt = (configuration) =>
  Effect.promise(() => tryAcquireAny(configuration));

export const waitingForSlot = (
  configuration: WaitConfiguration,
  attempt: SlotAttempt = attemptOnDisk,
): Effect.Effect<SlotHold | "budget-exhausted"> =>
  Effect.gen(function* waitUntilFree() {
    const startedAt = yield* Clock.currentTimeMillis;
    const waiterPath = reserveWaiterPath(configuration.slotDir, { now: () => startedAt });
    const interruptHandler = makeWaitingInterruptHandler({
      entryPath: waiterPath,
      removeEntry: removeWaiter,
    });
    installInterruptHandler(interruptHandler);
    yield* writeWaiterEntry(waiterPath);
    return yield* pollForSlot(
      { configuration, attempt },
      { entryName: baseName(waiterPath), startedAt, lastPrinted: "" },
    ).pipe(
      Effect.ensuring(
        removeWaiter(waiterPath).pipe(
          Effect.orDie,
          Effect.andThen(
            Effect.sync(() => {
              dropInterruptHandler(interruptHandler);
            }),
          ),
        ),
      ),
    );
  }).pipe(Effect.orDie);
