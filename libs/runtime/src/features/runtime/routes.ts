import { Effect, Exit, Schema, type Cause } from "effect";

import {
  failedStatus,
  type ElysiaContext,
  type ElysiaHandler,
  type Failed,
} from "./elysia-server.ts";
import {
  failureResponse,
  inputFailures,
  reportedFailure,
  type AnyFailureTable,
  type ExactFailureTable,
  type InputKind,
  type Tagged,
} from "./failures.ts";
import { readJsonBody, readSearchParams } from "./http-input.ts";
import { hidden, routeDetail, type Guard, type RouteDetail, type RouteSpec } from "./openapi.ts";
import { unavailableResponse, unavailableStatus } from "./unavailable.ts";

import type { RequestRejected, Reporting } from "@repo/observability";
import type { AppOrigin } from "./app-origin.ts";
import type { Decodable } from "./contracts.ts";
import type { InputInvalid } from "./input-invalid.ts";
import type { WorkerRuntime } from "./worker-runtime.ts";

type InputHandler<Input, Value, Failures, Requirements> = (
  incoming: Request,
  input: Input,
) => Effect.Effect<Value, Failures, Requirements>;
type Settled<Value> = (served: ElysiaContext) => Promise<Value>;
type AnsweredRoute<Input extends Decodable, Value, Encoded, Failures extends Tagged> = RouteSpec<
  Input,
  Value,
  Encoded
> & {
  readonly failures: ExactFailureTable<Failures>;
};
type Handler<Value, Failures, Requirements> = (
  incoming: Request,
) => Effect.Effect<Value, Failures, Requirements>;
type SiteRoutes<Requirements> = {
  readonly guard: <Failures extends Tagged>(
    check: Handler<unknown, Failures, Requirements>,
    failures: ExactFailureTable<Failures>,
  ) => Guard;
  readonly raw: <Failures extends Tagged>(
    respond: Handler<Response, Failures, Requirements>,
    failures: ExactFailureTable<Failures>,
  ) => readonly [RouteDetail, ElysiaHandler];
};
type ApiRoutes<Requirements> = SiteRoutes<Requirements> & {
  readonly route: <Input extends Decodable, Value, Encoded, Failures extends Tagged>(
    spec: AnsweredRoute<Input, Value, Encoded, Failures>,
    respond: InputHandler<Input["Type"], Value, Failures, Requirements>,
  ) => readonly [RouteDetail, Settled<Encoded | Failed>];
};

const settler =
  <Services>(runtime: WorkerRuntime<Services, unknown>) =>
  <Value>(
    program: (incoming: Request) => Effect.Effect<Value, never, Services>,
    unavailable: (cause: Readonly<Cause.Cause<unknown>>) => Effect.Effect<Value>,
  ): Settled<Value> =>
  async (served) => {
    const settledExit = await runtime.runPromiseExit(program(served.request));
    return Exit.isSuccess(settledExit)
      ? settledExit.value
      : Effect.runPromise(unavailable(settledExit.cause));
  };

const respondFailing =
  (failures: AnyFailureTable) =>
  <Value, Failures extends Tagged, Requirements>(respond: Handler<Value, Failures, Requirements>) =>
  (incoming: Request): Effect.Effect<Value | Response, never, Requirements> =>
    respond(incoming).pipe(Effect.catchCause((cause) => failureResponse(failures, cause)));

const passed = (): undefined => undefined;

const siteRoutes = <Services>(
  runtime: WorkerRuntime<Services, unknown>,
  reporting: Reporting,
): SiteRoutes<Services> => {
  const settle = settler(runtime);
  const unavailable = unavailableResponse(reporting);
  return {
    guard: (check, failures) =>
      settle(
        respondFailing({ ...inputFailures.body, ...failures })((incoming: Request) =>
          check(incoming).pipe(Effect.map(passed)),
        ),
        unavailable,
      ),
    raw: (respond, failures) => [
      hidden,
      settle(respondFailing({ ...inputFailures.body, ...failures })(respond), unavailable),
    ],
  };
};

const inputKind = <Input extends Decodable, Value, Encoded>(
  spec: RouteSpec<Input, Value, Encoded>,
): InputKind => {
  if (spec.body !== undefined) {
    return "body";
  }
  return spec.query === undefined ? "none" : "query";
};

const absentInput = undefined;

const withInput = <Input extends Decodable, Value, Encoded, Failures, Requirements>(
  spec: RouteSpec<Input, Value, Encoded>,
  respond: InputHandler<Input["Type"], Value, Failures, Requirements>,
): Handler<Value, Failures | RequestRejected | InputInvalid, Requirements | AppOrigin> => {
  const { body: bodyContract, query: queryContract } = spec;
  if (bodyContract !== undefined) {
    return (incoming) =>
      readJsonBody(bodyContract, incoming).pipe(
        Effect.flatMap((input) => respond(incoming, input)),
      );
  }
  if (queryContract !== undefined) {
    return (incoming) =>
      readSearchParams(queryContract, incoming).pipe(
        Effect.flatMap((input) => respond(incoming, input)),
      );
  }
  return (incoming) => respond(incoming, absentInput);
};

const respondEncoded = <
  Input extends Decodable,
  Value,
  Encoded,
  Failures extends Tagged,
  Requirements,
>(
  spec: AnsweredRoute<Input, Value, Encoded, Failures>,
  respond: Handler<Value, Failures | RequestRejected | InputInvalid, Requirements>,
): ((incoming: Request) => Effect.Effect<Encoded | Failed, never, Requirements>) => {
  const encode = Schema.encodeEffect(spec.response);
  const table: AnyFailureTable = { ...inputFailures.body, ...spec.failures };
  return (incoming) =>
    respond(incoming).pipe(
      Effect.flatMap((answered) => Effect.orDie(encode(answered))),
      Effect.catchCause((cause) => reportedFailure(table, cause).pipe(Effect.map(failedStatus))),
    );
};

const apiRoutes = <Requirements>(
  runtime: WorkerRuntime<AppOrigin | Requirements, unknown>,
  reporting: Reporting,
): ApiRoutes<AppOrigin | Requirements> => {
  const settle = settler(runtime);
  const unavailable = unavailableStatus(reporting);
  return {
    ...siteRoutes(runtime, reporting),
    route: (spec, respond) => [
      routeDetail(spec, { ...inputFailures[inputKind(spec)], ...spec.failures }),
      settle(respondEncoded(spec, withInput(spec, respond)), unavailable),
    ],
  };
};

export { apiRoutes, siteRoutes };
export type { AnsweredRoute, ApiRoutes, Handler, InputHandler, SiteRoutes };
