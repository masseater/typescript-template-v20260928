import type { RepositoryProblem } from "../repository-checks/index.ts";

export type DependencyCatalogFindings = {
  readonly problems: readonly RepositoryProblem[];
  readonly warnings: readonly RepositoryProblem[];
};

export type DependencyCatalogReport = DependencyCatalogFindings & {
  readonly definitionUnreadable: boolean;
  readonly definitionMissing: boolean;
  readonly scanned: number;
};

export const NO_DEPENDENCY_CATALOG_FINDINGS: DependencyCatalogFindings = {
  problems: [],
  warnings: [],
};

export const formatDependencyCatalogProblem = ({
  file,
  message,
}: RepositoryProblem): string => `${file} ${message}`;
