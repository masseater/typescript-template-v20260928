import { memoize } from "es-toolkit";

import { path } from "../../../../platform/path.ts";
import {
  listRepositoryFiles,
  readTextFile,
  type ScannedFile,
  type TextReader,
} from "../canonical-values/source-files.ts";
import { buildStyleClassIndex, type ReadStyleSheet, type StyleClassIndex } from "./class-index.ts";

const readableFilesIn = (
  readText: TextReader,
  files: readonly ScannedFile[],
): readonly ReadStyleSheet[] =>
  files.flatMap((file) => {
    const source = readText(file.absolutePath);
    return source === null ? [] : [{ relativePath: file.relativePath, source }];
  });

export const buildRepositoryStyleClassIndex = ({
  repositoryRoot,
  readText = readTextFile,
}: {
  readonly repositoryRoot: string;
  readonly readText?: TextReader;
}): StyleClassIndex => {
  const listed = listRepositoryFiles(path.resolve(repositoryRoot));
  return buildStyleClassIndex({
    styleSheets: readableFilesIn(readText, listed.styleSheets),
    referenceTexts: readableFilesIn(readText, [
      ...listed.commentSources,
      ...listed.markupSources,
    ]).map((file) => file.source),
  });
};

export const loadStyleClassIndex = memoize(
  (ruleOptions: { readonly repositoryRoot: string }): StyleClassIndex =>
    buildRepositoryStyleClassIndex({ repositoryRoot: ruleOptions.repositoryRoot }),
  { getCacheKey: (ruleOptions) => path.resolve(ruleOptions.repositoryRoot) },
);
