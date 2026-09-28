import type { ESTree } from "@oxlint/plugins";
import type { UnknownFields } from "../../../lint-rule-authoring/index.ts";

export const NODE_TYPE_FIELD = "type";

export const BACK_REFERENCE_FIELD = "parent";

export const isAstFields = (held: unknown): held is UnknownFields =>
  typeof held === "object" && held !== null && !Array.isArray(held);

export const ancestorsOf = (node: ESTree.Node): readonly ESTree.Node[] => {
  const { parent } = node;
  return parent === null ? [] : [...ancestorsOf(parent), parent];
};
