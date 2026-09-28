import { assert, it } from "@effect/vitest";
import { WEBHOOK_DISPOSITION } from "@repo/config";
import { listMemberInvoices } from "@repo/db";
import { TestDatabase, runStatement } from "@repo/db/testing";
import { appEnvironment } from "@repo/runtime/testing";
import { Effect, Layer, Logger, References } from "effect";

import { handleStripeEvent } from "./stripe-events.ts";
import { Stripe } from "./stripe.ts";

import type { StripeEvent } from "./stripe.ts";

type Warning = Readonly<{ annotations: Readonly<Record<string, unknown>>; message: unknown }>;

const stripeLayer = Layer.orDie(Stripe.fromEnvironment(appEnvironment()));
const customerId = "cus_unknown_yet";
const subscriptionId = "sub_unknown_yet";
const createdAt = 1_790_000_000;

function recordingWarnings(warnings: Warning[]): Layer.Layer<never> {
  return Logger.layer([
    Logger.make(({ fiber, logLevel, message }) => {
      if (logLevel === "Warn") {
        warnings.push({
          annotations: fiber.getRef(References.CurrentLogAnnotations),
          message: Array.isArray(message) ? message[0] : message,
        });
      }
    }),
  ]);
}

function addMember(id: string): Effect.Effect<unknown, unknown> {
  return runStatement(
    "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, 1, 0, 0)",
    id,
    id,
    `${id}@example.com`,
  );
}

function invoiceEvent(
  type: "invoice.finalized" | "invoice.paid" | "invoice.payment_failed",
  id: string,
  subscriptionMetadata: Readonly<Record<string, string>>,
): StripeEvent {
  return {
    created: createdAt,
    data: {
      object: {
        amount_due: 980,
        amount_paid: type === "invoice.paid" ? 980 : 0,
        amount_remaining: type === "invoice.paid" ? 0 : 980,
        currency: "jpy",
        customer: customerId,
        hosted_invoice_url: null,
        id: "in_unknown_yet",
        metadata: {},
        parent: {
          subscription_details: { metadata: subscriptionMetadata, subscription: subscriptionId },
        },
        status: type === "invoice.paid" ? "paid" : "open",
      },
    },
    id,
    type,
  };
}

function handled(event: StripeEvent, warnings: Warning[]) {
  return handleStripeEvent(event).pipe(
    Effect.provide(Layer.merge(stripeLayer, recordingWarnings(warnings))),
  );
}

it.effect(
  "puts a subscription invoice that arrives before the checkout into the member's ledger",
  () =>
    Effect.gen(function* program() {
      const warnings: Warning[] = [];
      yield* addMember("member");
      const disposition = yield* handled(
        invoiceEvent("invoice.paid", "evt_paid_early", { member_id: "member" }),
        warnings,
      );
      const ledger = yield* listMemberInvoices("member");
      assert.strictEqual(disposition, WEBHOOK_DISPOSITION.applied);
      assert.deepStrictEqual(
        ledger.map((invoice) => [invoice.stripeInvoiceId, invoice.status]),
        [["in_unknown_yet", "paid"]],
      );
      assert.deepStrictEqual(warnings, []);
    }).pipe(Effect.provide(TestDatabase)),
);

it.effect(
  "reports invoice events it cannot tie to a member or subscription as unmatched with a warning",
  () =>
    Effect.gen(function* program() {
      const warnings: Warning[] = [];
      const finalized = yield* handled(
        invoiceEvent("invoice.finalized", "evt_finalized_orphan", {}),
        warnings,
      );
      const failed = yield* handled(
        invoiceEvent("invoice.payment_failed", "evt_failed_orphan", {}),
        warnings,
      );
      assert.deepStrictEqual(
        [finalized, failed],
        [WEBHOOK_DISPOSITION.unmatched, WEBHOOK_DISPOSITION.unmatched],
      );
      assert.deepStrictEqual(warnings, [
        {
          annotations: {
            "stripe.event.id": "evt_finalized_orphan",
            "stripe.event.type": "invoice.finalized",
            "stripe.object.id": "in_unknown_yet",
          },
          message: "stripe.webhook.unmatched",
        },
        {
          annotations: {
            "stripe.event.id": "evt_failed_orphan",
            "stripe.event.type": "invoice.payment_failed",
            "stripe.object.id": "in_unknown_yet",
          },
          message: "stripe.webhook.unmatched",
        },
      ]);
    }).pipe(Effect.provide(TestDatabase)),
);
