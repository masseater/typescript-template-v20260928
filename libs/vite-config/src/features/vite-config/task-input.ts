const taskInput = [
  { auto: true },
  { base: "workspace", pattern: "!node_modules/.modules.yaml" },
  { base: "workspace", pattern: "!**/node_modules/.bin/**" },
  { base: "workspace", pattern: "!**/node_modules/.cache/**" },
] as const;

const dependencyManifests = [
  { base: "workspace", pattern: "pnpm-lock.yaml" },
  { base: "workspace", pattern: "pnpm-workspace.yaml" },
] as const;

export { dependencyManifests, taskInput };
