import { describe, expect, it } from "vite-plus/test";

import { reported } from "./lint-harness-test-fixture.ts";

const consumer = "/project/libs/telemetry/src/features/telemetry/telemetry.ts";
const owner = "/project/libs/config/src/features/config/optional-config.ts";

const rewrappedConfigs = [
  [
    "config-map",
    'import { Config, Option } from "effect"; export const setting = (name: string) => Config.option(Config.String(name)).pipe(Config.map(Option.getOrUndefined));',
  ],
  [
    "generic-config-map",
    'import { Config, Option } from "effect"; export function optional<Value>(config: Config.Config<Value>) { return Config.option(config).pipe(Config.map(Option.getOrUndefined)); }',
  ],
  [
    "effect-map-in-pipe",
    'import { Config, ConfigProvider, Effect, Option } from "effect"; export const read = (name: string) => Effect.runSync(Config.option(Config.String(name)).pipe(Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv()), Effect.map(Option.getOrUndefined)));',
  ],
  [
    "unwrapped-yield",
    'import { Config, Effect, Option } from "effect"; export const read = Effect.gen(function* read() { return Option.getOrUndefined(yield* Config.option(Config.String("NAME"))); });',
  ],
  [
    "module-subpath",
    'import * as Config from "effect/Config"; import * as Option from "effect/Option"; export const setting = Config.option(Config.String("NAME")).pipe(Config.map(Option.getOrUndefined));',
  ],
  [
    "aliased-import",
    'import { Config as Settings, Option as Maybe } from "effect"; export const setting = Settings.option(Settings.String("NAME")).pipe(Settings.map(Maybe.getOrUndefined));',
  ],
] as const;

const otherReads = [
  [
    "shared-owner",
    'import { optionalConfig } from "@repo/config/optional-config"; import { Config } from "effect"; export const setting = optionalConfig(Config.String("NAME"));',
  ],
  [
    "option-kept",
    'import { Config } from "effect"; export const setting = Config.option(Config.String("NAME"));',
  ],
  [
    "other-option-unwrapped",
    'import { Effect, Option } from "effect"; export const read = Effect.succeed(Option.some(1)).pipe(Effect.map(Option.getOrUndefined));',
  ],
  [
    "option-matched",
    'import { Config, Option } from "effect"; export const setting = Config.option(Config.String("NAME")).pipe(Config.map(Option.getOrElse(() => "fallback")));',
  ],
] as const;

describe("optional config outside its owner", () => {
  it.for(rewrappedConfigs)("rejects rewrapping an unset config as undefined: %s", ([, code]) => {
    expect.assertions(1);
    expect(reported("optional-config", { code, filename: consumer })).toBe(true);
  });

  it.for(otherReads)("allows other config reads: %s", ([, code]) => {
    expect.assertions(1);
    expect(reported("optional-config", { code, filename: consumer })).toBe(false);
  });

  it("allows the owner to define it", () => {
    expect.assertions(1);
    const code =
      'import { Config, Option } from "effect"; export const optionalConfig = <Value>(config: Config.Config<Value>) => Config.option(config).pipe(Config.map(Option.getOrUndefined));';
    expect(reported("optional-config", { code, filename: owner })).toBe(false);
  });
});
