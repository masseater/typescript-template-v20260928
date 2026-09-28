import { describe } from "vite-plus/test";

import { testLintRule } from "../../../../lint-rule-authoring/rule-tester-test-fixture.ts";
import { noHandRolledJws } from "./no-hand-rolled-jws--sign-with-jose.ts";

describe("dont-review-it/no-hand-rolled-jws--sign-with-jose", () => {
  testLintRule(noHandRolledJws, {
    valid: [
      {
        name: "signing a JWT with jose is allowed",
        documented: true,
        code: 'import { SignJWT, importPKCS8 } from "jose";\nconst key = await importPKCS8(pem, "RS256");\nconst jwt = await new SignJWT().setProtectedHeader({ alg: "RS256" }).setIssuer("4242").sign(key);',
      },
      {
        name: "an HMAC over a webhook payload is not a JWS signature",
        documented: true,
        code: 'const key = await crypto.subtle.importKey("raw", secret, { hash: "SHA-256", name: "HMAC" }, false, ["sign"]);\nconst mac = await crypto.subtle.sign("HMAC", key, payload);',
      },
      {
        name: "verifying a signature is not signing one",
        code: 'await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, signed);',
      },
      {
        name: "a digest is not a signature",
        code: 'await crypto.subtle.digest("SHA-256", bytes);',
      },
      {
        name: "an algorithm the source does not spell out is not judged",
        code: "await crypto.subtle.sign(algorithm, key, payload);",
      },
      {
        name: "a sign method on something other than SubtleCrypto is not judged",
        code: 'await signer.sign("RSASSA-PKCS1-v1_5", key, payload);',
      },
      {
        name: "an algorithm object without a spelled name is not judged",
        code: 'await crypto.subtle.importKey("pkcs8", der, { hash: "SHA-256", [field]: "RSASSA-PKCS1-v1_5" }, false, ["sign"]);',
      },
    ],
    invalid: [
      {
        name: "importing an RSA key for RS256 through WebCrypto is rejected",
        documented: true,
        code: 'const key = await crypto.subtle.importKey("pkcs8", der, { hash: "SHA-256", name: "RSASSA-PKCS1-v1_5" }, false, ["sign"]);',
        errors: [{ messageId: "handRolledJws" }],
      },
      {
        name: "signing with RSASSA-PKCS1-v1_5 through WebCrypto is rejected",
        documented: true,
        code: 'const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));',
        errors: [{ messageId: "handRolledJws" }],
      },
      {
        name: "signing with ECDSA through globalThis is rejected",
        code: 'await globalThis.crypto.subtle.sign({ hash: "SHA-256", name: "ECDSA" }, key, payload);',
        errors: [{ messageId: "handRolledJws" }],
      },
      {
        name: "signing through a destructured subtle is rejected",
        code: 'const { subtle } = crypto;\nawait subtle.sign("Ed25519", key, payload);',
        errors: [{ messageId: "handRolledJws" }],
      },
      {
        name: "an algorithm name in another case is rejected",
        code: 'await crypto.subtle.importKey("jwk", jwk, { name: "rsa-pss", hash: "SHA-256" }, false, ["sign"]);',
        errors: [{ messageId: "handRolledJws" }],
      },
    ],
  });
});
