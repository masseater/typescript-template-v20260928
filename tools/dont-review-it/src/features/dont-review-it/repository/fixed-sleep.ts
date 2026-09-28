import { isUndeclared } from "./real-clock.ts";
import { fixtureOrTestFile, reportViolation, type LintContext, type Node } from "./lint-context.ts";
import { origins } from "./references.ts";

import type { Visitor } from "vite-plus/lint/plugins";

const timerGlobals: ReadonlySet<string> = new Set(["setInterval", "setTimeout"]);

const effectModule = /^effect(?:\/|$)/u;

const timersModule = /^(?:node:)?timers(?:\/promises)?$/u;

const callsGlobalTimer = (inspection: LintContext, callee: Node): boolean => {
  if (callee.type === "Identifier") {
    return timerGlobals.has(callee.name) && isUndeclared(inspection, callee);
  }
  return (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.object.type === "Identifier" &&
    callee.object.name === "globalThis" &&
    callee.property.type === "Identifier" &&
    timerGlobals.has(callee.property.name)
  );
};

const callsImportedWait = (inspection: LintContext, callee: Node): boolean =>
  origins(inspection, callee).some((origin) => {
    const source = origin[0] ?? "";
    const imported = origin.at(-1) ?? "";
    return (
      (effectModule.test(source) && imported === "sleep") ||
      (timersModule.test(source) && timerGlobals.has(imported))
    );
  });

const fixedSleepVisitor = (inspection: LintContext): Visitor => {
  if (!fixtureOrTestFile.test(inspection.filename.replaceAll("\\", "/"))) {
    return {};
  }
  return {
    CallExpression(node: Node): void {
      if (
        node.type === "CallExpression" &&
        (callsGlobalTimer(inspection, node.callee) || callsImportedWait(inspection, node.callee))
      ) {
        reportViolation(inspection, node);
      }
    },
  };
};

export { fixedSleepVisitor };
