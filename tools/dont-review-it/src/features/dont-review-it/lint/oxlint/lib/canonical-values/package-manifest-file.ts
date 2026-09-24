import {
  packageManifestFrom,
  type PackageManifest,
} from "../../../../platform/package-manifest.ts";
import { path } from "../../../../platform/path.ts";
import { MANIFEST_FILE_NAME } from "./package-manifest.ts";
import { readJsonFile } from "./read-json-file.ts";

export const readPackageManifest = (packageDirectory: string): PackageManifest | null => {
  const source = path.join(packageDirectory, MANIFEST_FILE_NAME);
  const declared = readJsonFile(source);
  return declared === null ? null : packageManifestFrom({ declared, source });
};
