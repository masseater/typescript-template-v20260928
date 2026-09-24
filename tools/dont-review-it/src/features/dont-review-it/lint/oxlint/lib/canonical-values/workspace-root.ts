import { path } from "../../../../platform/path.ts";
import { readPackageManifest } from "./package-manifest-file.ts";
import { isFile } from "./source-files.ts";

const WORKSPACE_MANIFEST_FILE_NAMES: readonly string[] = [
  "pnpm-workspace.yaml",
  "pnpm-workspace.yml",
];

const manifestDeclaresWorkspaces = (directory: string): boolean =>
  readPackageManifest(directory)?.workspaces !== undefined;

const isWorkspaceRoot = (directory: string): boolean =>
  WORKSPACE_MANIFEST_FILE_NAMES.some((spelled) => isFile(path.join(directory, spelled))) ||
  manifestDeclaresWorkspaces(directory);

const nearestWorkspaceRoot = (directory: string): string | null => {
  if (isWorkspaceRoot(directory)) return directory;
  const parent = path.dirname(directory);
  return parent === directory ? null : nearestWorkspaceRoot(parent);
};

export const findWorkspaceRoot = (startDirectory: string): string => {
  const start = path.resolve(startDirectory);
  return nearestWorkspaceRoot(start) ?? start;
};
