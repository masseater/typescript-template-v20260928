import { env } from "cloudflare:workers";
import { Layer } from "effect";

import { FileStore } from "./file-store.ts";
const fixtureOrigin = "http://localhost:3001";
const fixtureAuthSecret = "worker-test-secret-of-at-least-32-characters-0123456789";
const appEnvironment = (
  overrides: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> => {
  return {
    ...env,
    APP_ORIGIN: fixtureOrigin,
    APP_RELEASE: "test",
    ASSETS: { fetch: (): Promise<Response> => Promise.resolve(new Response(undefined)) },
    AUTH_SECRET: fixtureAuthSecret,
    EMAIL_FROM: "sender@example.test",
    OPS_EMAIL: "ops@example.test",
    STRIPE_METERED_PRICE_ID: "price_TestMetered",
    STRIPE_PRICE_ID: "price_TestMonthly",
    STRIPE_SECRET_KEY: "sk_test_placeholder",
    STRIPE_WEBHOOK_SECRET: "whsec_testsecret",
    ...overrides,
  };
};
const testFileStore = Layer.orDie(FileStore.fromEnvironment(env));
export { consumeJobs } from "./jobs.ts";
export { appEnvironment, fixtureOrigin, testFileStore };
