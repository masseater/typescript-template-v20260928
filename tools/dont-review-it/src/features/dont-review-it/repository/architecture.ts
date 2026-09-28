import { buildTargets } from "@repo/config";

const modularLayers = ["app", "features", "shared"] as const;

const fsdLayers = ["app", "pages", "widgets", "features", "entities", "shared"] as const;

const modularBudgets = {
  app: 400,
  shared: 800,
} as const;

type ArchitectureKind = "fsd" | "modular";

const fsdPackages: readonly string[] = buildTargets;

const architectureKindOf = (workspacePath: string): ArchitectureKind | undefined => {
  const matched = /^(?<area>apps|libs|tools|infra)\/(?<name>[^/]+)$/u.exec(workspacePath)?.groups;
  if (matched === undefined) {
    return undefined;
  }
  if (matched["area"] === "apps" && fsdPackages.includes(matched["name"] ?? "")) {
    return "fsd";
  }
  return "modular";
};

export { architectureKindOf, fsdLayers, fsdPackages, modularBudgets, modularLayers };
