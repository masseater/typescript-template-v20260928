import { isPlainObject } from "es-toolkit";

import { stringEntriesOf } from "./record-fields.ts";

import type { DependencyCatalogChecksConfig } from "./config.ts";

export type DependencyReference = {
  readonly manifestPath: string;
  readonly dependencyName: string;
  readonly specifier: string;
};

export const dependencyReferencesIn = ({
  manifestPath,
  manifest,
  config,
}: {
  readonly manifestPath: string;
  readonly manifest: unknown;
  readonly config: DependencyCatalogChecksConfig;
}): readonly DependencyReference[] =>
  config.dependencyFields.flatMap((field) =>
    stringEntriesOf(isPlainObject(manifest) ? manifest[field] : null).map(
      ([dependencyName, specifier]) => ({
        manifestPath,
        dependencyName,
        specifier,
      }),
    ),
  );
