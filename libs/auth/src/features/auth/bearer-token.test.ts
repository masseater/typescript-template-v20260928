import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { bearerToken } from "./bearer-token.ts";

describe("bearerToken", () => {
  it("accepts the scheme in any letter case", () => {
    expect(bearerToken("bearer abc")).toStrictEqual(Option.some("abc"));
  });

  it("accepts more than one space between the scheme and the token", () => {
    expect(bearerToken("Bearer  abc")).toStrictEqual(Option.some("abc"));
  });

  it("refuses a token that contains whitespace", () => {
    expect(bearerToken("Bearer a b")).toStrictEqual(Option.none());
  });

  it("refuses another scheme, a missing token and a missing header", () => {
    expect(bearerToken("Basic abc")).toStrictEqual(Option.none());
    expect(bearerToken("Bearer ")).toStrictEqual(Option.none());
    expect(bearerToken(null)).toStrictEqual(Option.none());
  });
});
