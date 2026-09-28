import {
  fixtureOrTestFile,
  reportViolation,
  scopeOf,
  type LintContext,
  type Node,
} from "./lint-context.ts";
import { origins } from "./references.ts";

import type { Visitor } from "vite-plus/lint/plugins";

const wallClockGlobals: ReadonlyMap<string, string> = new Map([
  ["Date", "now"],
  ["performance", "now"],
]);

const effectModule = /^effect(?:\/|$)/u;

const isUndeclared = (inspection: LintContext, node: Node): boolean => {
  if (node.type !== "Identifier") {
    return false;
  }
  for (let scope = scopeOf(inspection, node); scope !== null; scope = scope.upper) {
    if (scope.set.has(node.name)) {
      return scope.set.get(node.name)?.defs.length === 0;
    }
  }
  return true;
};

const readsGlobalClock = (inspection: LintContext, callee: Node): boolean => {
  if (callee.type !== "MemberExpression" || callee.computed) {
    return false;
  }
  const { object, property } = callee;
  return (
    object.type === "Identifier" &&
    property.type === "Identifier" &&
    wallClockGlobals.get(object.name) === property.name &&
    isUndeclared(inspection, object)
  );
};

const readsEffectWallClock = (inspection: LintContext, callee: Node): boolean =>
  origins(inspection, callee).some(
    (origin) => effectModule.test(origin[0] ?? "") && origin.at(-1) === "nowUnsafe",
  );

const realClockVisitor = (inspection: LintContext): Visitor => {
  if (!fixtureOrTestFile.test(inspection.filename.replaceAll("\\", "/"))) {
    return {};
  }
  return {
    CallExpression(node: Node): void {
      if (
        node.type === "CallExpression" &&
        (readsGlobalClock(inspection, node.callee) ||
          readsEffectWallClock(inspection, node.callee))
      ) {
        reportViolation(inspection, node);
      }
    },
    NewExpression(node: Node): void {
      if (
        node.type === "NewExpression" &&
        node.arguments.length === 0 &&
        node.callee.type === "Identifier" &&
        node.callee.name === "Date" &&
        isUndeclared(inspection, node.callee)
      ) {
        reportViolation(inspection, node);
      }
    },
  };
};

export { isUndeclared, realClockVisitor };
