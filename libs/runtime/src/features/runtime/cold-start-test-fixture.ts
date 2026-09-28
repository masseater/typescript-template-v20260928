import { APPLICATION } from "@repo/config";
import { Telemetry } from "@repo/observability";
import { Context, Effect, Layer } from "effect";

import { workerRuntime } from "./worker-runtime.ts";
import { serveWorker, type FetchWorker } from "./worker.ts";

class Slow extends Context.Service<Slow, { readonly value: string }>()("Slow") {}

const ARRIVALS_PATH = "/arrivals";
const BUILD_AFTER_ARRIVALS = "x-build-after-arrivals";

const arrivals = { count: 0 };
const everyoneArrived = Promise.withResolvers<void>();

const slowBuild = Effect.promise(() => everyoneArrived.promise).pipe(
  Effect.as({ value: "built" }),
);
const telemetry = Layer.orDie(
  Telemetry.layer({ release: "test", routes: { "/": "home" }, serviceName: APPLICATION.user }),
);
const runtime = workerRuntime(() => Layer.merge(Layer.effect(Slow, slowBuild), telemetry));

const respondBuilt = Effect.gen(function* respond() {
  const slow = yield* Slow;
  return new Response(slow.value);
});

const coldStartWorker = serveWorker({
  reporting: { service: APPLICATION.user },
  route: () => respondBuilt,
  runtime,
});

const countedWorker: FetchWorker = {
  fetch: (httpRequest, environment, runtimeContext) => {
    if (new URL(httpRequest.url).pathname === ARRIVALS_PATH) {
      return Promise.resolve(new Response(String(arrivals.count)));
    }
    arrivals.count += 1;
    if (arrivals.count >= Number(httpRequest.headers.get(BUILD_AFTER_ARRIVALS) ?? "1")) {
      everyoneArrived.resolve();
    }
    return coldStartWorker.fetch(httpRequest, environment, runtimeContext);
  },
};

const coldStartFixturePath = (): string => new URL(import.meta.url).pathname;

export { ARRIVALS_PATH, BUILD_AFTER_ARRIVALS, coldStartFixturePath };
export default countedWorker;
