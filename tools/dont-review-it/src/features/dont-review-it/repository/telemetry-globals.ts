import { reportViolation, type LintContext, type Node } from "./lint-context.ts";
import { origins, type Origin } from "./references.ts";

import type { Visitor } from "vite-plus/lint/plugins";

const specFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;

const telemetryApiModules: ReadonlySet<string> = new Set([
  "@opentelemetry/api",
  "@opentelemetry/api-logs",
]);

const processModules: ReadonlySet<string> = new Set(["node:process", "process"]);

const removesEveryListener = (origin: Origin): boolean => {
  const [source = "", first = "", second = ""] = origin;
  return (
    (processModules.has(source) && first === "removeAllListeners") ||
    (source === "global" && first === "process" && second === "removeAllListeners")
  );
};

const disablesTelemetryApi = (origin: Origin): boolean => {
  const [source = "", , method = ""] = origin;
  return telemetryApiModules.has(source) && origin.length === 3 && method === "disable";
};

const telemetryGlobalsVisitor = (inspection: LintContext): Visitor => {
  if (!specFile.test(inspection.filename.replaceAll("\\", "/"))) {
    return {};
  }
  return {
    CallExpression(node: Node): void {
      if (node.type !== "CallExpression") {
        return;
      }
      if (
        origins(inspection, node.callee).some(
          (origin) => removesEveryListener(origin) || disablesTelemetryApi(origin),
        )
      ) {
        reportViolation(inspection, node);
      }
    },
  };
};

export { telemetryGlobalsVisitor };
