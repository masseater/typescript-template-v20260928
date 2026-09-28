import { parseSync } from "oxc-parser";

import { nodesOfType } from "../nodes-of-type.ts";
import { propertyKeyOf } from "../object-literal.ts";
import { lintBlockOf } from "./lint-config-suppression.ts";

import type { ESTree } from "@oxlint/plugins";

export const parsedConfig = (source: string) => {
  const body = parseSync("vite.config.ts", source).program.body.map(
    (statement) => statement as ESTree.Statement,
  );
  const propertyNamed = (name: string): ESTree.ObjectProperty => {
    const found = body
      .flatMap((statement) => nodesOfType(statement, "Property"))
      .find((property) => propertyKeyOf(property) === name);
    if (found === undefined) throw new Error(`the configuration under test must spell ${name}`);
    return found;
  };
  const objectHolding = (name: string): ESTree.ObjectExpression => {
    const held = propertyNamed(name);
    const found = body
      .flatMap((statement) => nodesOfType(statement, "ObjectExpression"))
      .find((object) => object.properties.includes(held));
    if (found === undefined) throw new Error(`the configuration under test must hold ${name}`);
    return found;
  };
  const literalSpelling = (spelling: string): ESTree.Expression => {
    const found = body
      .flatMap((statement) => nodesOfType(statement, "Literal"))
      .find((literal) => literal.value === spelling);
    if (found === undefined) throw new Error(`the configuration under test must spell ${spelling}`);
    return found;
  };
  const lint = lintBlockOf({ body });
  if (lint === null) throw new Error("the configuration under test must hold a lint block");
  return { body, lint, propertyNamed, objectHolding, literalSpelling };
};
