import { Encoding, Result } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { emailChangeTarget } from "./verification-token.ts";

describe("emailChangeTarget", () => {
  describe("a decoded token without updateTo", () => {
    const it = test.extend("signupDestination", () =>
      emailChangeTarget(`hdr.${Encoding.encodeBase64Url(JSON.stringify({}))}.sig`));

    it("treats the token as signup verification", ({ signupDestination }) => {
      expect(signupDestination).toStrictEqual(Result.succeed(undefined));
    });
  });

  describe("a decoded token carrying updateTo", () => {
    const it = test.extend("emailChangeDestination", () =>
      emailChangeTarget(
        `hdr.${Encoding.encodeBase64Url(JSON.stringify({ updateTo: "next@example.com" }))}.sig`,
      ));

    it("returns the email-change destination", ({ emailChangeDestination }) => {
      expect(emailChangeDestination).toStrictEqual(Result.succeed("next@example.com"));
    });
  });

  describe("a token whose claims segment cannot be decoded", () => {
    const it = test.extend("undecodableClaimsRefusal", () =>
      Result.match(emailChangeTarget("hdr.!!!not-base64!!!.sig"), {
        onFailure: (refusal) => refusal._tag,
        onSuccess: (destination) => destination,
      }));

    it("fails closed", ({ undecodableClaimsRefusal }) => {
      expect(undecodableClaimsRefusal).toBe("VerificationTokenInvalid");
    });
  });

  describe("a token with no claims segment", () => {
    const it = test.extend("opaqueTokenRefusal", () =>
      Result.match(emailChangeTarget("opaque-token"), {
        onFailure: (refusal) => refusal._tag,
        onSuccess: (destination) => destination,
      }));

    it("fails closed", ({ opaqueTokenRefusal }) => {
      expect(opaqueTokenRefusal).toBe("VerificationTokenInvalid");
    });
  });
});
