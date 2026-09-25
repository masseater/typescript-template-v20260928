import { buildTargets } from "./wiki.ts";

export const modularLayers = ["app", "features", "shared"] as const;
export type ModularLayer = (typeof modularLayers)[number];

export const fsdLayers = ["app", "pages", "widgets", "features", "entities", "shared"] as const;
export type FsdLayer = (typeof fsdLayers)[number];

export const modularBudgets = {
  app: 400,
  shared: 800,
} as const;

export const architectureKinds = ["fsd", "modular"] as const;
export type ArchitectureKind = (typeof architectureKinds)[number];

export const fsdPackages = buildTargets;
const fsdWorkspacePaths: ReadonlySet<string> = new Set(
  fsdPackages.map((buildTarget) => `apps/${buildTarget}`),
);

export const architectureKindOf = (workspacePath: string): ArchitectureKind =>
  fsdWorkspacePaths.has(workspacePath) ? "fsd" : "modular";
