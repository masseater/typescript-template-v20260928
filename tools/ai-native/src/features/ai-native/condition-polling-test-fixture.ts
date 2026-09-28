import { Data, Duration, Effect, Schedule } from "effect";

const POLL_INTERVAL = Duration.millis(20);

const POLL_DEADLINE = Duration.seconds(20);

export class ConditionNeverHeld extends Data.TaggedError("ConditionNeverHeld")<{
  readonly condition: string;
}> {}

export const untilHolds = <E, R>(
  condition: string,
  check: Effect.Effect<boolean, E, R>,
): Effect.Effect<void, E | ConditionNeverHeld, R> =>
  check.pipe(
    Effect.repeat({ until: (held: boolean) => held, schedule: Schedule.spaced(POLL_INTERVAL) }),
    Effect.timeoutOrElse({
      duration: POLL_DEADLINE,
      orElse: () => Effect.fail(new ConditionNeverHeld({ condition })),
    }),
    Effect.asVoid,
  );
