import { Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { CHECKOUT_RETURN, InvalidCheckoutReturn, readCheckoutReturn } from "./billing.ts";

describe("readCheckoutReturn", () => {
  it("reads no checkout return when the search names none", () => {
    expect.hasAssertions();
    expect(readCheckoutReturn({})).toStrictEqual({});
  });

  it("reads the checkout return that the payment page sends back", () => {
    expect.hasAssertions();
    expect(readCheckoutReturn({ checkout: CHECKOUT_RETURN.success })).toStrictEqual({
      checkout: CHECKOUT_RETURN.success,
    });
    expect(readCheckoutReturn({ checkout: CHECKOUT_RETURN.cancel })).toStrictEqual({
      checkout: CHECKOUT_RETURN.cancel,
    });
  });

  it("fails on a checkout return it does not know instead of reading it as none", () => {
    expect.hasAssertions();
    expect(() => readCheckoutReturn({ checkout: "foo" })).toThrow(
      expect.toSatisfy(Schema.is(InvalidCheckoutReturn)),
    );
  });
});
