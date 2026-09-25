import { APPLICATION } from "@repo/config";
import { configuredAppLayer } from "@repo/runtime";
import { readAppStorage, readWorkerConfig } from "@repo/runtime/bindings";
import { Effect, Layer } from "effect";

import { Stripe } from "#shared/billing/index.ts";
import { Interviewer } from "#shared/interview/server.ts";
import { PhotoStore } from "#shared/photo/index.ts";
import { ProfileLayoutAssembler } from "#shared/profile-layout/assembler.ts";
import { opsMailLayer } from "./ops-mail.ts";

type WorkerConfig = Effect.Success<ReturnType<typeof readWorkerConfig>>;

const memberService = APPLICATION.user;

function memberRequirementLayer(config: WorkerConfig, environment: unknown) {
  const model = config.AI === undefined ? undefined : { binding: config.AI };
  return Layer.mergeAll(
    opsMailLayer(config),
    Interviewer.layer(model),
    PhotoStore.fromFileStore(),
    ProfileLayoutAssembler.layer(model),
    Stripe.fromEnvironment(environment),
  );
}

function memberLayer(environment: unknown, routes: Readonly<Record<string, string>>) {
  return Layer.unwrap(
    readWorkerConfig(environment).pipe(
      Effect.flatMap((config) =>
        Effect.gen(function* memberServices() {
          const storage = yield* readAppStorage(environment, memberService);
          const base = configuredAppLayer({
            appConfig: config,
            audience: memberService,
            routes,
            storage,
          });
          return Layer.mergeAll(
            base,
            memberRequirementLayer(config, environment).pipe(Layer.provide(base)),
          );
        }),
      ),
    ),
  );
}

export { memberLayer };
