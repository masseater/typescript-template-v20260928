import { filename, reportViolation, type LintContext, type Node } from "./lint-context.ts";
import { origins, type Origin } from "./references.ts";

import type { Visitor } from "vite-plus/lint/plugins";

const optionalConfigOwner = "/libs/config/src/features/config/optional-config.ts";

const optionalConfigImport = "@repo/config/optional-config";

const isEffectMember = (origin: Origin, member: readonly [string, string]): boolean => {
  const [source, ...members] = origin;
  const [module, name] = member;
  return source === "effect"
    ? members[0] === module && members[1] === name && members.length === 2
    : source === `effect/${module}` && members[0] === name && members.length === 1;
};

const resolvesTo = (
  inspection: LintContext,
  node: Node,
  member: readonly [string, string],
): boolean => origins(inspection, node).some((origin) => isEffectMember(origin, member));

const isConfigOption = (inspection: LintContext, node: Node): boolean =>
  node.type === "CallExpression" && resolvesTo(inspection, node.callee, ["Config", "option"]);

const mapsToUndefined = (inspection: LintContext, node: Node, module: string): boolean => {
  if (node.type !== "CallExpression" || !resolvesTo(inspection, node.callee, [module, "map"])) {
    return false;
  }
  const [mapping] = node.arguments;
  return mapping !== undefined && resolvesTo(inspection, mapping, ["Option", "getOrUndefined"]);
};

const yieldedValue = (node: Node): Node =>
  node.type === "YieldExpression" && node.delegate && node.argument !== null ? node.argument : node;

const unwrapsConfigOption = (inspection: LintContext, node: Node): boolean => {
  if (node.type !== "CallExpression") {
    return false;
  }
  if (mapsToUndefined(inspection, node, "Config")) {
    return true;
  }
  const [unwrapped] = node.arguments;
  if (
    unwrapped !== undefined &&
    resolvesTo(inspection, node.callee, ["Option", "getOrUndefined"]) &&
    isConfigOption(inspection, yieldedValue(unwrapped))
  ) {
    return true;
  }
  const { callee } = node;
  return (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property.type === "Identifier" &&
    callee.property.name === "pipe" &&
    isConfigOption(inspection, callee.object) &&
    node.arguments.some((step) => mapsToUndefined(inspection, step, "Effect"))
  );
};

const optionalConfigVisitor = (inspection: LintContext): Visitor => {
  if (filename(inspection).endsWith(optionalConfigOwner)) {
    return {};
  }
  return {
    CallExpression(node: Node): void {
      if (unwrapsConfigOption(inspection, node)) {
        reportViolation(inspection, node);
      }
    },
  };
};

export { optionalConfigImport, optionalConfigVisitor };
