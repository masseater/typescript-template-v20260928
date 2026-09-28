import {
  aiMeterEventName,
  aiUsageUnitAmount,
  billingCurrency,
  stripeApiVersion,
  stripeWebhookEvents,
} from "@repo/config";
import { apiRoot } from "@repo/runtime/http";
import * as Output from "alchemy/Output";
import * as Stripe from "alchemy/Stripe";
import { Effect } from "effect";

import { stripeSandboxKey } from "./settings.ts";

import type { Redacted } from "effect";

const subscriptionPrice = (
  id: string,
  props: Omit<Parameters<typeof Stripe.Price>[1], "currency">,
) => Stripe.Price(id, { ...props, currency: billingCurrency });

const billingProgram = Effect.fn("billingProgram")(function* billingProgram(
  prefix: string,
  origin: string,
) {
  const secretKey = yield* stripeSandboxKey;
  const product = yield* Stripe.Product("PaidPlan", { name: `${prefix} paid plan` });
  const price = yield* subscriptionPrice("PaidMonthly", {
    product: product.id,
    recurring: { interval: "month" },
    unitAmount: 500,
  });
  const meter = yield* Stripe.BillingMeter("AiUsage", {
    defaultAggregation: { formula: "sum" },
    displayName: `${prefix} AI usage`,
    eventName: aiMeterEventName,
  });
  const meteredPrice = yield* subscriptionPrice("AiUsageMonthly", {
    product: product.id,
    recurring: { interval: "month", meter: meter.id, usageType: "metered" },
    unitAmount: aiUsageUnitAmount,
  });
  const webhook = yield* Stripe.WebhookEndpoint("BillingWebhook", {
    apiVersion: stripeApiVersion,
    enabledEvents: [...stripeWebhookEvents],
    url: `${origin}${apiRoot}/billing/webhook`,
  });
  return {
    STRIPE_METERED_PRICE_ID: meteredPrice.id,
    STRIPE_PRICE_ID: price.id,
    STRIPE_SECRET_KEY: secretKey,
    STRIPE_WEBHOOK_SECRET: webhook.secret.pipe(
      Output.mapEffect((secret: Redacted.Redacted | undefined) =>
        secret === undefined
          ? Effect.die(new Error("Stripe webhook endpoint has no stored signing secret"))
          : Effect.succeed(secret),
      ),
    ),
  };
});

export { billingProgram };
