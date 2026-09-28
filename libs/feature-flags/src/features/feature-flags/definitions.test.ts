import { describe, expect, test } from "vite-plus/test";

import {
  booleanForVariation,
  FLAG_VARIATION,
  flagDefinitionFor,
  flagDefinitions,
  flagKeys,
  variationForBoolean,
} from "./definitions.ts";

describe("flag variations", () => {
  const it = test.extend("variationsOfEnabledAndDisabled", () =>
    [true, false].map((enabled) => variationForBoolean(enabled)));

  it("maps enabled to the enabled variation and disabled to the disabled one", ({
    variationsOfEnabledAndDisabled,
  }) => {
    expect(variationsOfEnabledAndDisabled).toStrictEqual([
      FLAG_VARIATION.enabled,
      FLAG_VARIATION.disabled,
    ]);
  });
});

describe("reading a variation back", () => {
  const it = test.extend("enabledStatesReadBack", () =>
    [FLAG_VARIATION.enabled, FLAG_VARIATION.disabled].map((variation) =>
      booleanForVariation(variation),
    ));

  it("reads the enabled variation as true and the disabled one as false", ({
    enabledStatesReadBack,
  }) => {
    expect(enabledStatesReadBack).toStrictEqual([true, false]);
  });
});

describe("flag definitions", () => {
  const it = test.extend("definitionsByKey", () =>
    flagKeys.map((flagKey) => flagDefinitionFor(flagKey)));

  it("finds the definition of every declared key in declaration order", ({ definitionsByKey }) => {
    expect(definitionsByKey).toStrictEqual(flagDefinitions);
  });
});
