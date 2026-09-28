import { astFieldsOf, listedFieldsOf, nodeTypeOf } from "../setup-modules/coupling-edges.ts";

import type { UnknownFields } from "../../../../lint-rule-authoring/index.ts";


export type NodeVisit = {
  readonly node: UnknownFields;
  readonly ancestors: readonly UnknownFields[];
};

const POSITION_FIELDS: ReadonlySet<string> = new Set([
  "comments",
  "end",
  "loc",
  "parent",
  "range",
  "start",
  "tokens",
]);

const TYPE_BEARING_FIELDS: ReadonlySet<string> = new Set([
  "implements",
  "returnType",
  "superTypeArguments",
  "typeAnnotation",
  "typeArguments",
  "typeName",
  "typeParameters",
]);

const isWalkedField = (field: string): boolean =>
  !POSITION_FIELDS.has(field) && !TYPE_BEARING_FIELDS.has(field);

const visitsUnder = (held: unknown, ancestors: readonly UnknownFields[]): readonly NodeVisit[] =>
  listedFieldsOf(held)
    .filter((node) => nodeTypeOf(node) !== "")
    .flatMap((node) => [
      { node, ancestors },
      ...Object.entries(node)
        .filter(([field]) => isWalkedField(field))
        .flatMap(([, nested]) => visitsUnder(nested, [...ancestors, node])),
    ]);

export const nodeVisitsIn = (root: unknown): readonly NodeVisit[] => visitsUnder(root, []);

export const fieldOf = (held: unknown, field: string): unknown =>
  listedFieldsOf(held).flatMap((node) => [node[field]])[0];

export const kindAt = (held: unknown): string => {
  const node = astFieldsOf(held);
  return node === null ? "" : nodeTypeOf(node);
};

export const chainFrom = (visit: NodeVisit, boundary: UnknownFields): readonly UnknownFields[] => {
  const at = visit.ancestors.indexOf(boundary);
  return at === -1 ? visit.ancestors : visit.ancestors.slice(at);
};

export const visitAt = (visit: NodeVisit, ancestor: UnknownFields): NodeVisit => ({
  node: ancestor,
  ancestors: visit.ancestors.slice(0, visit.ancestors.indexOf(ancestor)),
});

export const innermostOf = (
  ancestors: readonly UnknownFields[],
  wanted: ReadonlySet<string>,
): UnknownFields | null => ancestors.findLast((held) => wanted.has(nodeTypeOf(held))) ?? null;
