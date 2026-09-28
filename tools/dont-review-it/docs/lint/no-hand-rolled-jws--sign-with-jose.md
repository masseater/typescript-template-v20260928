---
description: "Disallow importing a signing key or signing with a JWS signature algorithm through WebCrypto directly, so JWTs and JWS are built by jose instead of by hand"
---

# no-hand-rolled-jws--sign-with-jose

<!-- BEGIN GENERATED rule-header -->

Disallow importing a signing key or signing with a JWS signature algorithm through WebCrypto directly, so JWTs and JWS are built by jose instead of by hand

- Tool: `oxlint`
- Fixable: no
- Suggestions: no
- Options: no
- Bundle: `writing`
- Source: [`no-hand-rolled-jws--sign-with-jose.ts`](../../src/features/dont-review-it/lint/oxlint/rules/writing/no-hand-rolled-jws--sign-with-jose.ts)

<!-- END GENERATED rule-header -->

## Violation

A call to `subtle.importKey(...)` or `subtle.sign(...)` on a SubtleCrypto receiver (`crypto.subtle`, `globalThis.crypto.subtle`, or a binding named `subtle`) whose algorithm is a JWS signature algorithm: `RSASSA-PKCS1-v1_5`, `RSA-PSS`, `ECDSA`, `Ed25519` or `Ed448`, spelled as a string or as the `name` of an algorithm object, in any case. Signing with one of these by hand means this code also owns the PEM and DER decoding of the key, the protected header, the claims and the base64url segments, all of which RFC 7515 and RFC 7519 define and jose already implements for every WebCrypto runtime, Cloudflare Workers included.

The algorithm is the only signal read. An algorithm held in a variable or built at run time is not judged, and an HMAC is left alone because an HMAC over a webhook payload is not a JWS. `verify`, `digest`, `generateKey` and `exportKey` are not read.

## Fix

Import the key with jose (`importPKCS8` for a PKCS#8 PEM, `importJWK` for a JWK) and build the token with `SignJWT`, or the signature with `CompactSign`. A key that arrives in another encoding is converted to PKCS#8 where it is stored, not each time it is used.

<!-- BEGIN GENERATED examples -->

Code this rule rejects.

```ts
// importing an RSA key for RS256 through WebCrypto is rejected
const key = await crypto.subtle.importKey("pkcs8", der, { hash: "SHA-256", name: "RSASSA-PKCS1-v1_5" }, false, ["sign"]);
```

```ts
// signing with RSASSA-PKCS1-v1_5 through WebCrypto is rejected
const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
```

Code this rule accepts.

```ts
// signing a JWT with jose is allowed
import { SignJWT, importPKCS8 } from "jose";
const key = await importPKCS8(pem, "RS256");
const jwt = await new SignJWT().setProtectedHeader({ alg: "RS256" }).setIssuer("4242").sign(key);
```

```ts
// an HMAC over a webhook payload is not a JWS signature
const key = await crypto.subtle.importKey("raw", secret, { hash: "SHA-256", name: "HMAC" }, false, ["sign"]);
const mac = await crypto.subtle.sign("HMAC", key, payload);
```

<!-- END GENERATED examples -->

### Forbidden bypasses (do not do this)

- Moving the algorithm into a variable so the call no longer spells it. The signature is still assembled by hand
- Signing with `HMAC` instead to get past the rule. That changes what the receiving party must verify, not who builds the token

## Messages

<!-- BEGIN GENERATED messages -->

| messageId | Text |
| --- | --- |
| `handRolledJws` | A JWS signature must not be assembled through WebCrypto directly. \`subtle.{{method}}\` is called with \`{{algorithm}}\`, a JWS signature algorithm, which leaves the key encoding, the header and the base64url segments to this code. Import the key with jose (\`importPKCS8\`, \`importJWK\`) and sign with \`SignJWT\` or \`CompactSign\`. |

<!-- END GENERATED messages -->

## Runtime Selection

<!-- BEGIN GENERATED runtime -->

This rule runs as an oxlint JS plugin, in the same pass as every other rule the workspace ships. It reads no options. A consumer turns it on or off as a whole.

<!-- END GENERATED runtime -->
