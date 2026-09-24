import { isPlainObject, sortBy } from "es-toolkit";

import { path } from "../../../../platform/path.ts";
import { readPackageManifest } from "../canonical-values/package-manifest-file.ts";
import { EXPORTS_CONDITION_DEPTH_LIMIT } from "../canonical-values/package-manifest.ts";
import { isFile } from "../canonical-values/source-files.ts";

import type { PackageManifest } from "../../../../platform/package-manifest.ts";

export type DependencyTypeEntry = {
  readonly packageName: string;
  readonly declarationsPath: string;
};

const WORKSPACE_PROTOCOL = "workspace:";

const NODE_MODULES_DIRECTORY_NAME = "node_modules";

const SPECIFIER_FIELDS = ["dependencies", "devDependencies", "peerDependencies"] as const;

const ROOT_SUBPATH = ".";

const rootExportsOf = (exportsField: unknown): unknown => {
  if (typeof exportsField === "string") return exportsField;
  if (!isPlainObject(exportsField)) return null;
  const subpaths = Object.entries(exportsField);
  const root = subpaths.find(([subpath]) => subpath === ROOT_SUBPATH);
  if (root !== undefined) return root[1];
  return subpaths.some(([subpath]) => subpath.startsWith(ROOT_SUBPATH)) ? null : exportsField;
};

const TYPES_CONDITION = "types";

const typesConditionIn = (held: unknown, depth: number): string | null => {
  if (!isPlainObject(held) || depth > EXPORTS_CONDITION_DEPTH_LIMIT) return null;
  const conditions = Object.entries(held);
  const declared = conditions.find(
    ([condition, checked]) => condition === TYPES_CONDITION && typeof checked === "string",
  );
  if (declared !== undefined) return String(declared[1]);
  for (const [, nested] of conditions) {
    const found = typesConditionIn(nested, depth + 1);
    if (found !== null) return found;
  }
  return null;
};

const anyConditionIn = (held: unknown, depth: number): string | null => {
  if (typeof held === "string") return held;
  if (!isPlainObject(held) || depth > EXPORTS_CONDITION_DEPTH_LIMIT) return null;
  for (const [, nested] of Object.entries(held)) {
    const found = anyConditionIn(nested, depth + 1);
    if (found !== null) return found;
  }
  return null;
};

const entryPathsOf = (manifest: PackageManifest): readonly string[] => {
  const rootExports = rootExportsOf(manifest.exports);
  return [
    typesConditionIn(rootExports, 0),
    anyConditionIn(rootExports, 0),
    manifest.types,
    manifest.typings,
    manifest.main,
  ].filter((filePath): filePath is string => filePath !== null && filePath !== undefined);
};

const DECLARATIONS_SUFFIX_PATTERN = /\.[cm]?tsx?$/u;

const SCRIPT_SUFFIX_PATTERN = /\.([cm]?)js$/u;

const declarationsCandidateFor = (entryPath: string): string | null => {
  if (DECLARATIONS_SUFFIX_PATTERN.test(entryPath)) return entryPath;
  if (!SCRIPT_SUFFIX_PATTERN.test(entryPath)) return null;
  return entryPath.replace(SCRIPT_SUFFIX_PATTERN, ".d.$1ts");
};

const declarationsOf = (dependencyDirectory: string): string | null => {
  const manifest = readPackageManifest(dependencyDirectory);
  if (manifest === null) return null;
  for (const entryPath of entryPathsOf(manifest)) {
    const candidate = declarationsCandidateFor(entryPath);
    if (candidate === null) continue;
    const resolved = path.join(dependencyDirectory, candidate);
    if (isFile(resolved)) return resolved;
  }
  return null;
};

export const dependencyTypeEntries = (packageDirectory: string): readonly DependencyTypeEntry[] => {
  const manifest = readPackageManifest(packageDirectory);
  if (manifest === null) return [];

  const specifiers: Readonly<Record<string, string>> = Object.fromEntries(
    SPECIFIER_FIELDS.flatMap((field) => Object.entries(manifest[field] ?? {})),
  );

  const listedEntries = Object.entries(specifiers).flatMap(([packageName, range]) => {
    if (range.startsWith(WORKSPACE_PROTOCOL)) return [];
    const declarationsPath = declarationsOf(
      path.join(packageDirectory, NODE_MODULES_DIRECTORY_NAME, packageName),
    );
    return declarationsPath === null ? [] : [{ packageName, declarationsPath }];
  });

  return sortBy(listedEntries, ["packageName"]);
};
