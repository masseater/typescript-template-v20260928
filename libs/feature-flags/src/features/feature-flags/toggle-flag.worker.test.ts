import { ErrorCode, StandardResolutionReasons } from "@openfeature/server-sdk";
import { ConfigurationInvalid } from "@repo/config";
import { Effect } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { evaluationFromDetails } from "./evaluation.ts";
import { FLAG_EVALUATION_KIND } from "./flag-vocabulary.ts";
import { configuredFeatureFlagsLayer } from "./index.ts";

describe("a primary targeting result", () => {
  const it = test.extend("evaluation", () =>
    evaluationFromDetails({ reason: StandardResolutionReasons.TARGETING_MATCH, value: true }));

  it("keeps the evaluated value", ({ evaluation }) => {
    expect(evaluation).toStrictEqual({ enabled: true, kind: FLAG_EVALUATION_KIND.evaluated });
  });
});

describe("a provider error", () => {
  const it = test.extend("evaluation", () =>
    evaluationFromDetails({
      errorCode: ErrorCode.PROVIDER_NOT_READY,
      reason: StandardResolutionReasons.ERROR,
      value: true,
    }));

  it("fail-closes instead of treating the OpenFeature default as enabled", ({ evaluation }) => {
    expect(evaluation).toStrictEqual({ enabled: false, kind: FLAG_EVALUATION_KIND.failClosed });
  });
});

describe("feature flags outside local development without Flagship", () => {
  const it = test.extend("refusal", () =>
    Effect.runPromise(configuredFeatureFlagsLayer({ local: false }).pipe(Effect.flip)));

  it("names the missing binding", ({ refusal }) => {
    expect(refusal).toStrictEqual(new ConfigurationInvalid({ reason: "FLAGS" }));
  });
});
