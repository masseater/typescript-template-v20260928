import {
  declaredVariablesOf,
  fixtureOrTestFile,
  reportViolation,
  type LintContext,
  type Node,
  type NodeOf,
} from "./lint-context.ts";

import type { Visitor } from "vite-plus/lint/plugins";

const unremovedCreators: ReadonlySet<string> = new Set([
  "makeTempDirectory",
  "mkdtemp",
  "mkdtempSync",
]);
const cleanupRegistrars: ReadonlySet<string> = new Set(["onCleanup"]);
const releasingAcquirers: ReadonlySet<string> = new Set(["acquireRelease", "acquireUseRelease"]);
const suiteNames: ReadonlySet<string> = new Set(["describe", "suite"]);

const functionTypes: ReadonlySet<string> = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

const parentOf = (node: Node): Node | null => {
  const parent = "parent" in node ? (node.parent as Node | null | undefined) : null;
  return parent ?? null;
};

const calleeName = (node: Node): string | undefined => {
  if (node.type !== "CallExpression") {
    return undefined;
  }
  const { callee } = node;
  if (callee.type === "Identifier") {
    return callee.name;
  }
  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier"
  ) {
    return callee.property.name;
  }
  return undefined;
};

const isSuiteBody = (functionNode: Node): boolean => {
  const parent = parentOf(functionNode);
  if (parent === null || parent.type !== "CallExpression") {
    return false;
  }
  const name = calleeName(parent);
  return name !== undefined && suiteNames.has(name);
};

const enclosingFunctions = (node: Node): readonly Node[] => {
  const found: Node[] = [];
  for (let current = parentOf(node); current !== null; current = parentOf(current)) {
    if (functionTypes.has(current.type) && !isSuiteBody(current)) {
      found.push(current);
    }
  }
  return found;
};

const acquiredWithRelease = (node: Node): boolean => {
  let child = node;
  for (let current = parentOf(node); current !== null; current = parentOf(current)) {
    if (current.type === "CallExpression" && current.arguments[0] === child) {
      const name = calleeName(current);
      if (name !== undefined && releasingAcquirers.has(name)) {
        return true;
      }
    }
    child = current;
  }
  return false;
};

const passThroughTypes: ReadonlySet<string> = new Set([
  "AwaitExpression",
  "CallExpression",
  "ChainExpression",
  "MemberExpression",
]);

const declaratorHolding = (node: Node): Node | null => {
  for (let current = parentOf(node); current !== null; current = parentOf(current)) {
    if (current.type === "VariableDeclarator") {
      return current;
    }
    if (!passThroughTypes.has(current.type)) {
      return null;
    }
  }
  return null;
};

const insideAny = (node: Node, holders: ReadonlySet<Node>): boolean => {
  for (let current = parentOf(node); current !== null; current = parentOf(current)) {
    if (holders.has(current)) {
      return true;
    }
  }
  return false;
};

const removedThroughBinding = (
  inspection: LintContext,
  creation: { readonly node: Node; readonly cleanups: ReadonlySet<Node> },
): boolean => {
  const declarator = declaratorHolding(creation.node);
  if (declarator === null) {
    return false;
  }
  return declaredVariablesOf(inspection, declarator).some((variable) =>
    variable.references.some((reference) =>
      insideAny(reference.identifier as Node, creation.cleanups),
    ),
  );
};

const unremovedTempDirectoryVisitor = (
  inspection: LintContext,
  onCall: (node: NodeOf<"CallExpression">) => void,
): Visitor => {
  if (!fixtureOrTestFile.test(inspection.filename.replaceAll("\\", "/"))) {
    return {};
  }
  const creations: Node[] = [];
  const cleanupScopes = new Set<Node>();
  const cleanups = new Set<Node>();
  return {
    CallExpression(node: Node): void {
      if (node.type !== "CallExpression") {
        return;
      }
      onCall(node);
      const name = calleeName(node);
      if (name === undefined) {
        return;
      }
      if (unremovedCreators.has(name)) {
        creations.push(node);
      }
      if (cleanupRegistrars.has(name)) {
        cleanups.add(node);
        for (const scope of enclosingFunctions(node)) {
          cleanupScopes.add(scope);
        }
      }
    },
    "Program:exit"(): void {
      for (const creation of creations) {
        if (
          !acquiredWithRelease(creation) &&
          !removedThroughBinding(inspection, { node: creation, cleanups }) &&
          !enclosingFunctions(creation).some((scope) => cleanupScopes.has(scope))
        ) {
          reportViolation(inspection, creation);
        }
      }
    },
  };
};

export { unremovedTempDirectoryVisitor };
