import { memoize } from "es-toolkit";
import { parseSync } from "oxc-parser";

import { path } from "../../../../platform/path.ts";
import {
  listRepositoryFiles,
  readTextFile,
  type ScannedFile,
  type TextReader,
} from "../canonical-values/source-files.ts";
import { isOutOfScopeSource } from "../out-of-scope-source.ts";
import {
  buildCellClassIndex,
  EMPTY_CELL_CLASS_INDEX,
  type CellClassIndex,
  type ScannedSource,
} from "./cell-class-index.ts";
import { sourceFactsIn } from "./construction-sites.ts";

const scannedSourceAt = (readText: TextReader, file: ScannedFile): ScannedSource | null => {
  const source = readText(file.absolutePath);
  if (source === null) return null;

  const { program } = parseSync(file.relativePath, source);
  return { relativePath: file.relativePath, facts: sourceFactsIn(program) };
};

export const buildRepositoryCellClassIndex = ({
  repositoryRoot,
  readText = readTextFile,
}: {
  readonly repositoryRoot: string;
  readonly readText?: TextReader;
}): CellClassIndex => {
  const { declarationSources } = listRepositoryFiles(path.resolve(repositoryRoot));
  const scanned = declarationSources.filter((file) => !isOutOfScopeSource(file.relativePath));
  if (scanned.length === 0) return EMPTY_CELL_CLASS_INDEX;

  return buildCellClassIndex(
    scanned.map((file) => scannedSourceAt(readText, file)).filter((source) => source !== null),
  );
};

const cellClassIndexAt = memoize((repositoryRoot: string): CellClassIndex =>
  buildRepositoryCellClassIndex({ repositoryRoot }),
);

export const loadRepositoryCellClassIndex = ({
  repositoryRoot,
}: {
  readonly repositoryRoot: string;
}): CellClassIndex => cellClassIndexAt(path.resolve(repositoryRoot));
