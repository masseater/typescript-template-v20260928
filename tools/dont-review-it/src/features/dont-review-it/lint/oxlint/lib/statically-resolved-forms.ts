import { listedFieldsOf, nodeTypeOf, staticSpecifierOf } from "./setup-modules/coupling-edges.ts";

import type { UnknownFields } from "../../../lint-rule-authoring/index.ts";


export const STATICALLY_RESOLVED_FORMS: readonly string[] = ["URL", "import.meta.resolve"];

const CALLED_TYPES: ReadonlySet<string> = new Set(["CallExpression", "NewExpression"]);

const spelledNameOf = (node: UnknownFields): string | null => {
  const nodeType = nodeTypeOf(node);
  if (nodeType === "Identifier") return String(node.name);
  if (nodeType === "MetaProperty") return dottedNameOf([node.meta, node.property]);
  if (nodeType !== "MemberExpression" || node.computed === true) return null;
  return dottedNameOf([node.object, node.property]);
};

const dottedNameOf = (parts: readonly unknown[]): string | null => {
  const spelled = parts.map((part) => spelledNameOf(part as UnknownFields));
  return spelled.includes(null) ? null : spelled.join(".");
};

const WRAPPED_FIELD_BY_TYPE: ReadonlyMap<string, string> = new Map([
  ["AwaitExpression", "argument"],
  ["ChainExpression", "expression"],
  ["ParenthesizedExpression", "expression"],
  ["TSAsExpression", "expression"],
  ["TSNonNullExpression", "expression"],
]);

const carriedInsideOf = (node: UnknownFields): UnknownFields | null => {
  const nodeType = nodeTypeOf(node);
  const wrappedField = WRAPPED_FIELD_BY_TYPE.get(nodeType);
  if (wrappedField !== undefined) return node[wrappedField] as UnknownFields;
  return nodeType === "MemberExpression" ? (node.object as UnknownFields) : null;
};

const calledFormOf = (
  node: UnknownFields,
): { readonly head: string; readonly handed: readonly UnknownFields[] } | null => {
  const inside = carriedInsideOf(node);
  if (inside !== null) return calledFormOf(inside);
  if (!CALLED_TYPES.has(nodeTypeOf(node))) return null;

  const head = spelledNameOf(node.callee as UnknownFields);
  return head === null ? null : { head, handed: listedFieldsOf(node.arguments) };
};

export const namesStaticallyResolvedForm = ({
  node,
  forms,
  constants,
}: {
  readonly node: UnknownFields;
  readonly forms: ReadonlySet<string>;
  readonly constants: ReadonlyMap<string, string>;
}): boolean => {
  const called = calledFormOf(node);
  if (called === null || !forms.has(called.head)) return false;
  return called.handed.some((handed) => staticSpecifierOf(handed, constants) !== null);
};
