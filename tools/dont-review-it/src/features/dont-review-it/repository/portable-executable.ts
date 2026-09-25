import { reportViolation, type LintContext, type Node } from "./lint-context.ts";
import { staticText, variableOf } from "./references.ts";

import type { Visitor } from "vite-plus/lint/plugins";

const nonPortableShells: ReadonlySet<string> = new Set(["fish", "zsh"]);

const spawnFunctions: ReadonlySet<string> = new Set([
  "exec",
  "execFile",
  "execFileSync",
  "execSync",
  "spawn",
  "spawnSync",
]);

const isSpawnCall = (node: Node): boolean => {
  if (node.type !== "CallExpression") return false;
  const { callee } = node;
  if (callee.type === "Identifier") return spawnFunctions.has(callee.name);
  return (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.object.type === "Identifier" &&
    callee.object.name === "ChildProcess" &&
    callee.property.type === "Identifier" &&
    callee.property.name === "make"
  );
};

const candidateTexts = (
  inspection: LintContext,
  node: Node,
  visited: ReadonlySet<Node>,
): readonly string[] => {
  if (visited.has(node)) return [];
  const deepened = new Set([...visited, node]);
  if (node.type === "ConditionalExpression") {
    return [
      ...candidateTexts(inspection, node.consequent, deepened),
      ...candidateTexts(inspection, node.alternate, deepened),
    ];
  }
  if (node.type === "LogicalExpression") {
    return [
      ...candidateTexts(inspection, node.left, deepened),
      ...candidateTexts(inspection, node.right, deepened),
    ];
  }
  if (node.type === "Identifier") {
    const declaration = variableOf(inspection, node)?.defs[0]?.node;
    if (declaration?.type === "VariableDeclarator" && declaration.init) {
      return candidateTexts(inspection, declaration.init, deepened);
    }
  }
  const text = staticText(inspection, node);
  return text === undefined ? [] : [text];
};

const launchesNonPortableShell = (elements: readonly (Node | null)[]): boolean =>
  elements.some((element, index) => {
    const next = elements[index + 1];
    return (
      element?.type === "Literal" &&
      typeof element.value === "string" &&
      nonPortableShells.has(element.value) &&
      next?.type === "Literal" &&
      next.value === "-c"
    );
  });

const portableExecutableVisitor = (inspection: LintContext): Visitor => ({
  CallExpression(node: Node): void {
    if (node.type !== "CallExpression") return;
    for (const argument of node.arguments) {
      if (argument.type === "ArrayExpression" && launchesNonPortableShell(argument.elements)) {
        reportViolation(inspection, argument);
      }
    }
    if (!isSpawnCall(node)) return;
    const [executable] = node.arguments;
    if (
      executable !== undefined &&
      candidateTexts(inspection, executable, new Set()).some((text) => text.startsWith("/"))
    ) {
      reportViolation(inspection, executable);
    }
  },
});

export { portableExecutableVisitor };
