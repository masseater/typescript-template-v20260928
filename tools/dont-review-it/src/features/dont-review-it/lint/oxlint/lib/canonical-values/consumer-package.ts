import { memoize } from "es-toolkit";

import { packageDependencyFields } from "../../../../platform/package-manifest.ts";
import { path } from "../../../../platform/path.ts";
import { readPackageManifest } from "./package-manifest-file.ts";
import { nearestPackageDirectory } from "./source-files.ts";

import type { CanonicalValuesEntry } from "./catalog.ts";

const manifestAt = memoize(readPackageManifest);

const packageNameOf = (packageDirectory: string): string | null =>
  manifestAt(packageDirectory)?.name ?? null;

const reachablePackagesOf = memoize((packageDirectory: string): ReadonlySet<string> => {
  const manifest = manifestAt(packageDirectory);
  return new Set(packageDependencyFields.flatMap((field) => Object.keys(manifest?.[field] ?? {})));
});

export const ownersVisibleFrom = (consumer: {
  readonly filename: string;
  readonly repositoryRoot: string;
}): ((owner: CanonicalValuesEntry) => boolean) => {
  const packageDirectory = nearestPackageDirectory(
    path.dirname(consumer.filename),
    consumer.repositoryRoot,
  );
  const reachable =
    packageDirectory === null ? new Set<string>() : reachablePackagesOf(packageDirectory);
  const ownName = packageDirectory === null ? null : packageNameOf(packageDirectory);
  return (owner) =>
    owner.packageName === null ||
    owner.packageName === ownName ||
    (reachable.has(owner.packageName) && owner.importRoutes.length > 0);
};
