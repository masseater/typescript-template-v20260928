import { isSyntaxNode } from "../nodes-of-type.ts";

import type { ESTree, SourceCode } from "@oxlint/plugins";

export type SourceNode = {
  readonly ancestors: readonly ESTree.Node[];
  readonly node: ESTree.Node;
};

type SourceTree = Pick<SourceCode, "ast" | "visitorKeys">;

const childNodes = (sourceCode: SourceTree, node: ESTree.Node): readonly ESTree.Node[] =>
  (sourceCode.visitorKeys[node.type] ?? []).flatMap((visitorKey) => {
    const child: unknown = Reflect.get(node, visitorKey);
    return (Array.isArray(child) ? child : [child]).filter(isSyntaxNode);
  });

const nodesUnder = (sourceCode: SourceTree, input: SourceNode): readonly SourceNode[] => [
  input,
  ...childNodes(sourceCode, input.node).flatMap((child) =>
    nodesUnder(sourceCode, { ancestors: [...input.ancestors, input.node], node: child }),
  ),
];

export const sourceNodes = (sourceCode: SourceTree): readonly SourceNode[] =>
  nodesUnder(sourceCode, { ancestors: [], node: sourceCode.ast });
export type { SourceTree };
