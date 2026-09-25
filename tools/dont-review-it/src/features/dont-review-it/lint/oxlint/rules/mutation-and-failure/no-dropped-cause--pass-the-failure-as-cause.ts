import { createDontReviewItRule } from "../../../../create-rule.ts";
import { resolveBinding } from "../../lib/resolved-bindings.ts";

import type { ESTree, Scope } from "@oxlint/plugins";

type WrittenFunction = ESTree.ArrowFunctionExpression | ESTree.Function;

type ScopeReader = Readonly<{
  declaredIn: (node: ESTree.Node) => readonly Readonly<{
    name: string;
    references: readonly Readonly<{ identifier: ESTree.Node }>[];
  }>[];
  scopeAt: (node: ESTree.Node) => Scope;
}>;

const STRINGIFYING_CALLEES: ReadonlySet<string> = new Set(["String", "stringify"]);

const WRAPPER_METHOD = "mapError";

const isWrittenFunction = (node: ESTree.Node): node is WrittenFunction =>
  node.type === "ArrowFunctionExpression" ||
  node.type === "FunctionExpression" ||
  node.type === "FunctionDeclaration";

const calleeName = (callee: ESTree.Node): string | null => {
  if (callee.type === "Identifier") return callee.name;
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier"
  ) {
    return callee.property.name;
  }
  return null;
};

const handsOnFailure = (reference: ESTree.Node): boolean => {
  const parent = reference.parent as ESTree.Node;
  if (parent.type === "ConditionalExpression" && parent.test !== reference) {
    return handsOnFailure(parent);
  }
  if (parent.type === "ReturnStatement") return true;
  if (parent.type === "ArrowFunctionExpression") return parent.body === reference;
  if (parent.type === "Property") {
    return parent.value === reference && calleeName(parent.key) === "cause";
  }
  if (parent.type === "CallExpression" || parent.type === "NewExpression") {
    const name = calleeName(parent.callee);
    return (
      parent.callee !== reference &&
      parent.arguments.some((argument) => argument === reference) &&
      (name === null || !STRINGIFYING_CALLEES.has(name))
    );
  }
  return false;
};

const returnedExpressionOf = (written: WrittenFunction): ESTree.Node | null => {
  const body = written.body as ESTree.FunctionBody | ESTree.Expression | null;
  if (body === null) return null;
  if (body.type !== "BlockStatement") return body;
  const returned = body.body.find((statement) => statement.type === "ReturnStatement");
  return returned?.type === "ReturnStatement" ? returned.argument : null;
};

const declaredFunctionOf = (
  name: ESTree.Node & Readonly<{ name: string }>,
  reader: ScopeReader,
) => {
  const binding = resolveBinding(reader.scopeAt(name), name.name);
  const [definition] = binding?.defs ?? [];
  if (definition === undefined) return null;
  const declared = definition.node as ESTree.Node;
  if (isWrittenFunction(declared)) return declared;
  if (declared.type !== "VariableDeclarator" || declared.init === null) return null;
  return isWrittenFunction(declared.init) ? declared.init : null;
};

const wrappingFunctionOf = (handed: ESTree.Node, reader: ScopeReader): WrittenFunction | null => {
  if (isWrittenFunction(handed)) return handed;
  if (handed.type === "Identifier") return declaredFunctionOf(handed, reader);
  if (handed.type !== "CallExpression" || handed.callee.type !== "Identifier") return null;
  const factory = declaredFunctionOf(handed.callee, reader);
  const produced = factory === null ? null : returnedExpressionOf(factory);
  return produced !== null && isWrittenFunction(produced) ? produced : null;
};

const dropsFailure = (wrapping: WrittenFunction, reader: ScopeReader): boolean => {
  const [received] = wrapping.params;
  if (received?.type !== "Identifier") return true;
  const variable = reader.declaredIn(wrapping).find((declared) => declared.name === received.name);
  return !(variable?.references ?? []).some((reference) => handsOnFailure(reference.identifier));
};

const catchHandlerOf = (node: ESTree.ObjectExpression): ESTree.Node | null => {
  const named = (key: string) =>
    node.properties.find(
      (property) =>
        property.type === "Property" && !property.computed && calleeName(property.key) === key,
    );
  const handler = named("catch");
  if (named("try") === undefined || handler?.type !== "Property") return null;
  return handler.value;
};

export const noDroppedCause = createDontReviewItRule({
  name: "no-dropped-cause--pass-the-failure-as-cause",
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow a function handed to `mapError` or to the `catch` of a `try` object that builds a new failure without passing on the failure it received, so the original failure stays in the `cause` chain instead of being replaced by one that says only where it happened",
      relatedGuidelines: [".claude/skills/reviews/references/failure-handling-and-fallbacks.md"],
    },
    messages: {
      droppedCause:
        "A function that turns one failure into another must not leave the failure it received behind. Take the failure as its first parameter and put it in the new failure as `cause`, or hand it whole to the function that builds the new failure.",
    },
    schema: [],
  },
  create(inspection) {
    const reader: ScopeReader = {
      declaredIn: (node) => inspection.sourceCode.getDeclaredVariables(node),
      scopeAt: (node) => inspection.sourceCode.getScope(node),
    };
    const inspect = (handed: ESTree.Node | undefined, reported: ESTree.Node): void => {
      if (handed === undefined) return;
      const wrapping = wrappingFunctionOf(handed, reader);
      if (wrapping === null || !dropsFailure(wrapping, reader)) return;
      inspection.report({ node: reported, messageId: "droppedCause" });
    };
    return {
      CallExpression(node: ESTree.CallExpression) {
        if (calleeName(node.callee) !== WRAPPER_METHOD) return;
        inspect(node.arguments.at(-1), node);
      },
      ObjectExpression(node: ESTree.ObjectExpression) {
        const handler = catchHandlerOf(node);
        if (handler === null) return;
        inspect(handler, handler);
      },
    };
  },
});
