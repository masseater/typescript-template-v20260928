import { Config, ConfigProvider, Effect } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { optionalConfig } from "./optional-config.ts";

describe("optionalConfig", () => {
  describe("an unset variable", () => {
    const it = test.extend("setting", () =>
      Effect.runSync(
        optionalConfig(Config.String("TEMPLATE_OPTIONAL_SETTING")).pipe(
          Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env: {} })),
        ),
      ));

    it("reads as undefined", ({ setting }) => {
      expect(setting).toBe(undefined);
    });
  });

  describe("a set variable", () => {
    const it = test.extend("setting", () =>
      Effect.runSync(
        optionalConfig(Config.String("TEMPLATE_OPTIONAL_SETTING")).pipe(
          Effect.provideService(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromEnv({ env: { TEMPLATE_OPTIONAL_SETTING: "configured" } }),
          ),
        ),
      ));

    it("reads as its value", ({ setting }) => {
      expect(setting).toBe("configured");
    });
  });
});
