import { readJson, type RequestRejected } from "@repo/observability";
import { Effect, Schema } from "effect";

import { AppOrigin } from "./app-origin.ts";
import { InputInvalid } from "./input-invalid.ts";

import type { Decodable } from "./contracts.ts";

type BoundedRequest = {
  readonly incoming: Request;
  readonly limit: number;
};

const decodeInput = <Contract extends Decodable>(
  schema: Contract,
  input: unknown,
): Effect.Effect<Contract["Type"], InputInvalid> =>
  Schema.decodeUnknownEffect(schema, { onExcessProperty: "error" })(input).pipe(
    Effect.mapError(() => new InputInvalid()),
  );

const readJsonBody = <Contract extends Decodable>(
  schema: Contract,
  source: Request | BoundedRequest,
): Effect.Effect<Contract["Type"], RequestRejected | InputInvalid, AppOrigin> =>
  Effect.gen(function* readJsonBodyProgram() {
    const input = yield* readJson({
      expectedOrigin: yield* AppOrigin,
      ...(source instanceof Request ? { incoming: source } : source),
    });
    return yield* decodeInput(schema, input);
  });

const readSearchParams = <Contract extends Decodable>(
  schema: Contract,
  incoming: Request,
): Effect.Effect<Contract["Type"], InputInvalid> =>
  decodeInput(schema, Object.fromEntries(new URL(incoming.url).searchParams));

export { readJsonBody, readSearchParams };
export type { BoundedRequest };
