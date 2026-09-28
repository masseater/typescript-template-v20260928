import { defaultExportedObject, type ProgramStatements } from "./default-exported-object.ts";
import { objectValueOf } from "./object-literal.ts";

import type { ESTree } from "@oxlint/plugins";

const projectTestBlocks = (test: ESTree.ObjectExpression): readonly ESTree.ObjectExpression[] => {
  const projects = objectValueOf({ object: test, key: "projects" });
  if (projects?.type !== "ArrayExpression") return [];
  return projects.elements.flatMap((project) => {
    if (project?.type !== "ObjectExpression") return [];
    const projectTest = objectValueOf({ object: project, key: "test" });
    return projectTest?.type === "ObjectExpression" ? [projectTest] : [];
  });
};

export const testRunnerBlocks = (
  program: ProgramStatements,
): readonly ESTree.ObjectExpression[] => {
  const config = defaultExportedObject(program);
  const test = config === null ? null : objectValueOf({ object: config, key: "test" });
  return test?.type === "ObjectExpression" ? [test, ...projectTestBlocks(test)] : [];
};
