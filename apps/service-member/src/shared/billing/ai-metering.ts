import {
  findSubscription,
  markAiUsageReported,
  recordAiUsage,
  unreportedAiUsage,
  unreportedSubscriberAiUsage,
} from "@repo/db";
import { logCause } from "@repo/observability";
import { Cause, DateTime, Effect } from "effect";

import { Stripe } from "./stripe.ts";

const oneTurn = 1;
const meterBackdatingLimit = { days: 35 } as const;
const stripeDependency = "stripe";

type PendingUsage = Readonly<{
  customerId: string;
  identifier: string;
  occurredAt: Date;
  quantity: number;
}>;

const backdatingStart = Effect.map(DateTime.now, (now) =>
  DateTime.toDate(DateTime.subtract(now, meterBackdatingLimit)),
);

const reportPending = Effect.fn("billing.reportPending")(function* reportPending(
  pending: readonly PendingUsage[],
) {
  const stripe = yield* Stripe;
  yield* Effect.forEach(
    pending,
    (usage) =>
      stripe.reportUsage(usage).pipe(Effect.andThen(markAiUsageReported(usage.identifier))),
    { discard: true },
  );
});

const meterAiTurn = Effect.fn("billing.meterAiTurn")(function* meterAiTurn(
  turn: Readonly<{ identifier: string; memberId: string }>,
) {
  const subscription = yield* findSubscription(turn.memberId);
  if (subscription === undefined) {
    return { unreported: 0 };
  }
  yield* recordAiUsage({
    identifier: turn.identifier,
    memberId: turn.memberId,
    quantity: oneTurn,
  });
  const pending = { memberId: turn.memberId, since: yield* backdatingStart };
  const unreported = yield* unreportedAiUsage(pending);
  yield* reportPending(
    unreported.map((usage) => ({ ...usage, customerId: subscription.stripeCustomerId })),
  ).pipe(
    Effect.catchTag("StripeFailure", (failure) =>
      logCause({
        attributes: {
          dependency: stripeDependency,
          identifier: turn.identifier,
          reason: failure.reason,
        },
        cause: Cause.fail(failure),
        eventName: "billing.usage_unreported",
      }),
    ),
  );
  return { unreported: (yield* unreportedAiUsage(pending)).length };
});

const resendUnreportedAiUsage = Effect.fn("billing.resendUnreportedAiUsage")(
  function* resendUnreportedAiUsage() {
    const pending = yield* unreportedSubscriberAiUsage(yield* backdatingStart);
    yield* reportPending(pending).pipe(
      Effect.tapErrorTag("StripeFailure", (failure) =>
        logCause({
          attributes: { dependency: stripeDependency, reason: failure.reason },
          cause: Cause.fail(failure),
          eventName: "billing.usage_resend_failed",
        }),
      ),
    );
    return { resent: pending.length };
  },
);

export { meterAiTurn, resendUnreportedAiUsage };
