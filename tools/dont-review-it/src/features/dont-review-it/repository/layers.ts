import { fsdLayers, fsdPackages } from "./architecture.ts";
import { reportViolation, type LintContext, type Node } from "./lint-context.ts";

import type { Visitor } from "vite-plus/lint/plugins";

const layers: ReadonlySet<string> = new Set(fsdLayers);

const isOutsideLayers = (inspected: string): boolean => {
  const matched = /\/apps\/(?<app>[^/]+)\/src\/(?<inside>.+)$/u.exec(inspected)?.groups;
  const [layer, ...segments] = matched?.inside?.split("/") ?? [];
  return (
    fsdPackages.includes(matched?.app ?? "") && (segments.length === 0 || !layers.has(layer ?? ""))
  );
};

const layersVisitor = (inspection: LintContext): Visitor => {
  if (!isOutsideLayers(inspection.filename.replaceAll("\\", "/"))) {
    return {};
  }
  return {
    Program(node: Node): void {
      reportViolation(inspection, node);
    },
  };
};

export { layersVisitor };
