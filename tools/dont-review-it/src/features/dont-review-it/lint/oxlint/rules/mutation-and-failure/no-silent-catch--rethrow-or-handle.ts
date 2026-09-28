import { createDontReviewItRule } from "../../../../create-rule.ts";

import type { ESTree } from "@oxlint/plugins";

const decidingChildOf = (parent: ESTree.Node): ESTree.Node | null => {
  switch (parent.type) {
    case "ConditionalExpression":
    case "DoWhileStatement":
    case "ForStatement":
    case "IfStatement":
    case "WhileStatement":
      return parent.test;
    case "SwitchStatement":
      return parent.discriminant;
    default:
      return null;
  }
};

const carriesFailure = (node: ESTree.Node): boolean => {
  const parent = node.parent as ESTree.Node;
  if (parent.type === "CatchClause") return true;
  if (decidingChildOf(parent) === node) return false;
  return carriesFailure(parent);
};

const calleeName = (callee: ESTree.Node): string | null => {
  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "CallExpression") return calleeName(callee.callee);
  if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
    return callee.property.name;
  }
  return null;
};

const isDecode = (node: ESTree.Node | undefined): boolean =>
  node?.type === "CallExpression" && /^decode/u.test(calleeName(node.callee) ?? "");

const isEmptyLiteral = (node: ESTree.Node | null | undefined): boolean =>
  (node?.type === "ObjectExpression" && node.properties.length === 0) ||
  (node?.type === "ArrayExpression" && node.elements.length === 0);

const returnsEmpty = (node: ESTree.Node | undefined): boolean => {
  if (node?.type !== "ArrowFunctionExpression" && node?.type !== "FunctionExpression") {
    return false;
  }
  const { body } = node;
  if (body === null) return false;
  if (body.type !== "BlockStatement") return isEmptyLiteral(body);
  const [only] = body.body;
  return body.body.length === 1 && only?.type === "ReturnStatement" && isEmptyLiteral(only.argument);
};

const pipedFromDecode = (node: ESTree.CallExpression): boolean => {
  const parent = node.parent as ESTree.Node;
  if (parent.type !== "CallExpression" || calleeName(parent.callee) !== "pipe") return false;
  if (parent.callee.type === "MemberExpression") return isDecode(parent.callee.object);
  return parent.arguments[0] !== node && isDecode(parent.arguments[0]);
};

const replacesDecodeFailureWithEmpty = (node: ESTree.CallExpression): boolean => {
  if (calleeName(node.callee) !== "getOrElse") return false;
  const [first, second] = node.arguments;
  if (node.arguments.length === 1) return returnsEmpty(first) && pipedFromDecode(node);
  return isDecode(first) && returnsEmpty(second);
};

export const noSilentCatch = createDontReviewItRule({
  name: "no-silent-catch--rethrow-or-handle",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow a catch clause whose body never carries the failure it bound out of the clause, and a failed decode replaced with an empty object or array, so a failure that was caught reaches something able to act on it instead of ending where it was caught",
      relatedGuidelines: [".claude/skills/reviews/references/failure-handling-and-fallbacks.md"],
    },
    messages: {
      silentCatch:
        "A catch clause must not end without carrying the failure it bound out of the clause. Choose an ending that takes the failure with it: rethrow it, throw a failure that names this layer's part in it with the original passed as `cause`, hand it to the call that acts on it, or return a value that holds it.",
      emptyDecodeFallback:
        "A failed decode must not be replaced with an empty object or array, which reads the same as an input that named nothing. Return the failure, or throw a failure that names what could not be read, so the caller can tell a malformed input from an absent one.",
    },
    schema: [],
  },
  create(inspection) {
    return {
      CatchClause(node: ESTree.CatchClause) {
        if (node.param === null) return;

        const caught = inspection.sourceCode.getScope(node);
        const carried = caught.variables.some((variable) =>
          variable.references.some(
            (reference) => reference.isRead() && carriesFailure(reference.identifier),
          ),
        );
        if (carried) return;

        inspection.report({ node, messageId: "silentCatch" });
      },
      CallExpression(node: ESTree.CallExpression) {
        if (!replacesDecodeFailureWithEmpty(node)) return;
        inspection.report({ node, messageId: "emptyDecodeFallback" });
      },
    };
  },
});
