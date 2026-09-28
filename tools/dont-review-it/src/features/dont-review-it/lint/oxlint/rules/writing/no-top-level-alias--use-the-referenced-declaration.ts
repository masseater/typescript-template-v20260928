import { createDontReviewItRule } from "../../../../create-rule.ts";

import type { ESTree } from "@oxlint/plugins";

const pascalCase = /^\p{Lu}.*\p{Ll}/u;

const aliasedDeclarations = (statement: ESTree.Statement | ESTree.Directive | ESTree.ModuleDeclaration): readonly ESTree.Node[] => {
  const declaration =
    statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
  if (declaration === null || declaration === undefined) return [];
  if (declaration.type === "TSTypeAliasDeclaration") {
    const { typeAnnotation, typeParameters } = declaration;
    const aliasesAType =
      typeParameters === null &&
      typeAnnotation.type === "TSTypeReference" &&
      typeAnnotation.typeArguments === null;
    return aliasesAType ? [declaration] : [];
  }
  if (declaration.type === "VariableDeclaration" && declaration.kind === "const") {
    return declaration.declarations.filter(
      (declarator) =>
        declarator.init?.type === "Identifier" && pascalCase.test(declarator.init.name),
    );
  }
  return [];
};

export const noTopLevelAlias = createDontReviewItRule({
  name: "no-top-level-alias--use-the-referenced-declaration",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow a module level declaration that only gives another name to a type, a schema or a class, so every use site names the declaration that owns the shape and changing one declaration never silently changes the shape behind another name",
      relatedGuidelines: [
        ".claude/skills/reviews/references/remove-needless-branches-wrappers-and-work.md",
        ".claude/skills/reviews/references/type-the-vocabulary-never-paraphrase-names.md",
      ],
    },
    messages: {
      topLevelAlias:
        "This declaration only gives another name to an existing type, schema or class. Use the referenced declaration directly, or define a separate declaration when the concept differs.",
    },
    schema: [],
  },
  create(inspection) {
    return {
      Program(node: ESTree.Program) {
        for (const statement of node.body) {
          for (const alias of aliasedDeclarations(statement)) {
            inspection.report({ node: alias, messageId: "topLevelAlias" });
          }
        }
      },
    };
  },
});
