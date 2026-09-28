import { memoize } from "es-toolkit";

import { path } from "../../../../platform/path.ts";
import {
  listRepositoryFiles,
  nearestPackageDirectory,
  readTextFile,
  type ScannedFile,
  type TextReader,
} from "../canonical-values/source-files.ts";
import { isOutOfScopeSource } from "../out-of-scope-source.ts";
import { toPosixPath } from "../posix-path.ts";
import {
  buildTypeAuthorityIndex,
  EMPTY_TYPE_AUTHORITY_INDEX,
  type ScannedTypeFile,
  type TypeAuthorityIndex,
} from "./authority-index.ts";
import { typeDeclarationsIn } from "./type-declarations.ts";

const workspacePathOf = ({
  repositoryRoot,
  absolutePath,
}: {
  readonly repositoryRoot: string;
  readonly absolutePath: string;
}): string => {
  const packageDirectory = nearestPackageDirectory(path.dirname(absolutePath), repositoryRoot);
  return packageDirectory === null
    ? ""
    : toPosixPath(path.relative(repositoryRoot, packageDirectory));
};

const scannedTypeFileAt = (
  scan: { readonly repositoryRoot: string; readonly readText: TextReader },
  file: ScannedFile,
): ScannedTypeFile | null => {
  const { repositoryRoot } = scan;
  const source = scan.readText(file.absolutePath);
  if (source === null) return null;

  const declarations = typeDeclarationsIn(source);
  return declarations.length === 0
    ? null
    : {
        relativePath: file.relativePath,
        workspacePath: workspacePathOf({ repositoryRoot, absolutePath: file.absolutePath }),
        declarations,
      };
};

export const buildRepositoryTypeAuthorityIndex = ({
  repositoryRoot,
  readText = readTextFile,
}: {
  readonly repositoryRoot: string;
  readonly readText?: TextReader;
}): TypeAuthorityIndex => {
  const root = path.resolve(repositoryRoot);
  const { declarationSources } = listRepositoryFiles(root);
  const scanned = declarationSources.filter((file) => !isOutOfScopeSource(file.relativePath));
  if (scanned.length === 0) return EMPTY_TYPE_AUTHORITY_INDEX;

  return buildTypeAuthorityIndex(
    scanned
      .map((file) => scannedTypeFileAt({ repositoryRoot: root, readText }, file))
      .filter((file) => file !== null),
  );
};

const typeAuthorityIndexAt = memoize((repositoryRoot: string): TypeAuthorityIndex =>
  buildRepositoryTypeAuthorityIndex({ repositoryRoot }),
);

export const loadRepositoryTypeAuthorityIndex = ({
  repositoryRoot,
}: {
  readonly repositoryRoot: string;
}): TypeAuthorityIndex => typeAuthorityIndexAt(path.resolve(repositoryRoot));
