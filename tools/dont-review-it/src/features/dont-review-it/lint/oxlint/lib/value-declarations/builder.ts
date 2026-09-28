import { memoize } from "es-toolkit";

import { path } from "../../../../platform/path.ts";
import {
  listRepositoryFiles,
  readTextFile,
  type ScannedFile,
  type TextReader,
} from "../canonical-values/source-files.ts";
import { isOutOfScopeSource } from "../out-of-scope-source.ts";
import {
  buildValueDeclarationIndex,
  type IndexedValueFile,
  type ValueDeclarationIndex,
} from "./declaration-index.ts";
import { valueDeclarationsIn } from "./declarations.ts";

const readValueFileAt = (readText: TextReader, file: ScannedFile): IndexedValueFile | null => {
  const source = readText(file.absolutePath);
  if (source === null) return null;

  const declarations = valueDeclarationsIn({ source, relativePath: file.relativePath });
  return declarations.length === 0 ? null : { relativePath: file.relativePath, declarations };
};

export const buildRepositoryValueDeclarationIndex = ({
  repositoryRoot,
  readText = readTextFile,
}: {
  readonly repositoryRoot: string;
  readonly readText?: TextReader;
}): ValueDeclarationIndex => {
  const { declarationSources } = listRepositoryFiles(path.resolve(repositoryRoot));

  return buildValueDeclarationIndex(
    declarationSources
      .filter((file) => !isOutOfScopeSource(file.relativePath))
      .map((file) => readValueFileAt(readText, file))
      .filter((file) => file !== null),
  );
};

const valueDeclarationIndexAt = memoize((repositoryRoot: string): ValueDeclarationIndex =>
  buildRepositoryValueDeclarationIndex({ repositoryRoot }),
);

export const loadRepositoryValueDeclarationIndex = ({
  repositoryRoot,
}: {
  readonly repositoryRoot: string;
}): ValueDeclarationIndex => valueDeclarationIndexAt(path.resolve(repositoryRoot));
