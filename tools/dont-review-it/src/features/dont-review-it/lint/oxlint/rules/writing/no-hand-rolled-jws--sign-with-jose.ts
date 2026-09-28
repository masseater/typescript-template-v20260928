import { createDontReviewItRule } from "../../../../create-rule.ts";
import { objectValueOf } from "../../lib/object-literal.ts";
import { staticMemberOf } from "../../lib/static-member.ts";

import type { ESTree } from "@oxlint/plugins";

const SUBTLE_NAME = "subtle";

const ALGORITHM_POSITIONS: ReadonlyMap<string, number> = new Map([
  ["importKey", 2],
  ["sign", 0],
]);

const JWS_SIGNATURE_ALGORITHMS: ReadonlySet<string> = new Set([
  "ECDSA",
  "ED25519",
  "ED448",
  "RSA-PSS",
  "RSASSA-PKCS1-V1_5",
]);

const isSubtleCrypto = (receiver: ESTree.Expression): boolean =>
  receiver.type === "Identifier"
    ? receiver.name === SUBTLE_NAME
    : staticMemberOf(receiver)?.name === SUBTLE_NAME;

const stringValueOf = (written: ESTree.Node | undefined): string | null =>
  written?.type === "Literal" && typeof written.value === "string" ? written.value : null;

const algorithmNameOf = (written: ESTree.Node | undefined): string | null =>
  written?.type === "ObjectExpression"
    ? stringValueOf(objectValueOf({ object: written, key: "name" }) ?? undefined)
    : stringValueOf(written);

export const noHandRolledJws = createDontReviewItRule({
  name: "no-hand-rolled-jws--sign-with-jose",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow importing a signing key or signing with a JWS signature algorithm through WebCrypto directly, so JWTs and JWS are built by jose instead of by hand",
      relatedGuidelines: [".claude/skills/reviews/references/ownership-and-duplication.md"],
    },
    messages: {
      handRolledJws:
        "A JWS signature must not be assembled through WebCrypto directly. `subtle.{{method}}` is called with `{{algorithm}}`, a JWS signature algorithm, which leaves the key encoding, the header and the base64url segments to this code. Import the key with jose (`importPKCS8`, `importJWK`) and sign with `SignJWT` or `CompactSign`.",
    },
    schema: [],
  },
  create(inspection) {
    return {
      CallExpression(node: ESTree.CallExpression) {
        const called = staticMemberOf(node.callee);
        if (called === null || !isSubtleCrypto(called.object)) return;
        const position = ALGORITHM_POSITIONS.get(called.name);
        if (position === undefined) return;
        const algorithm = algorithmNameOf(node.arguments.at(position));
        if (algorithm === null || !JWS_SIGNATURE_ALGORITHMS.has(algorithm.toUpperCase())) return;
        inspection.report({
          node,
          messageId: "handRolledJws",
          data: { algorithm, method: called.name },
        });
      },
    };
  },
});
