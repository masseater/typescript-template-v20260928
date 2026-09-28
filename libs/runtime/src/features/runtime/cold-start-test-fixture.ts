import { APPLICATION } from "@repo/config";
import { Telemetry } from "@repo/observability";
import { Context, Effect, Layer } from "effect";

import { Assets } from "./assets.ts";
import { workerRuntime } from "./worker-runtime.ts";
import { serveApp } from "./worker.ts";

class Slow extends Context.Service<Slow, { readonly value: string }>()("Slow") {}

const buildTime = "300 millis";
const slowBuild = Effect.sleep(buildTime).pipe(Effect.as({ value: "built" }));
const telemetry = Layer.orDie(
  Telemetry.layer({ release: "test", routes: { "/": "home" }, serviceName: APPLICATION.user }),
);
const assets = Layer.succeed(Assets, { fetch: () => Promise.resolve(new Response(undefined)) });
const runtime = workerRuntime(() =>
  Layer.mergeAll(Layer.effect(Slow, slowBuild), telemetry, assets),
);

const respondBuilt = Effect.gen(function* respond() {
  const slow = yield* Slow;
  return new Response(slow.value);
});

const coldStartWorker = serveApp({
  reporting: { service: APPLICATION.user },
  route: () => respondBuilt,
  runtime,
});

const coldStartFixturePath = (): string => new URL(import.meta.url).pathname;

export { coldStartFixturePath };
export default coldStartWorker;
