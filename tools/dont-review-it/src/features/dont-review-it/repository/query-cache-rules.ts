import {
  filename,
  fixtureOrTestFile,
  reportViolation,
  type LintContext,
  type Node,
} from "./lint-context.ts";

import type { Visitor } from "vite-plus/lint/plugins";

const layoutRouteFile = /(?:^|\/)apps\/[^/]+\/src\/app\/routes\/(?:_[^/]+|__root)\.[cm]?[jt]sx?$/u;
const appSourceFile = /(?:^|\/)apps\/[^/]+\/src\//u;
const cacheWriters = new Set(["setQueriesData", "setQueryData"]);

const keyName = (node: Node): string | undefined => {
  if (node.type === "Identifier") {
    return node.name;
  }
  return node.type === "Literal" && typeof node.value === "string" ? node.value : undefined;
};

const layoutRouteLoaderVisitor = (inspection: LintContext): Visitor => {
  if (!layoutRouteFile.test(filename(inspection))) {
    return {};
  }
  return {
    Property(node: Node): void {
      if (node.type === "Property" && keyName(node.key) === "loader") {
        reportViolation(inspection, node);
      }
    },
  };
};

const queryCacheWriteVisitor = (inspection: LintContext): Visitor => {
  const inspected = filename(inspection);
  if (!appSourceFile.test(inspected) || fixtureOrTestFile.test(inspected)) {
    return {};
  }
  return {
    MemberExpression(node: Node): void {
      if (node.type === "MemberExpression" && cacheWriters.has(keyName(node.property) ?? "")) {
        reportViolation(inspection, node);
      }
    },
  };
};

export { layoutRouteLoaderVisitor, queryCacheWriteVisitor };
