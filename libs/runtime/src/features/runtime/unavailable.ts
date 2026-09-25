import { Effect, type Cause } from "effect";

import { failedStatus, type Failed } from "./elysia-server.ts";
import { failureBody, runtimeUnavailable } from "./failures.ts";
import { jsonResponse } from "./responses.ts";

import type { Reporting } from "@repo/observability";

const unavailableResponse =
  (reporting: Reporting) =>
  (cause: Readonly<Cause.Cause<unknown>>): Effect.Effect<Response> =>
    runtimeUnavailable(cause, reporting).pipe(
      Effect.map((failure) => jsonResponse(failureBody(failure), failure.status)),
    );

const unavailableStatus =
  (reporting: Reporting) =>
  (cause: Readonly<Cause.Cause<unknown>>): Effect.Effect<Failed> =>
    runtimeUnavailable(cause, reporting).pipe(Effect.map(failedStatus));

export { unavailableResponse, unavailableStatus };
