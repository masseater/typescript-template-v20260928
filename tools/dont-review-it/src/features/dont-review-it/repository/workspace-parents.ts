import { repositoryRoot } from "@repo/config/repository-root";
import { listedPackageParents, WORKSPACE_DEFINITION } from "@repo/config/workspace-members";
import { escapeRegExp } from "es-toolkit";

import { readTextFile } from "../lint/oxlint/lib/canonical-values/source-files.ts";
import { path } from "../platform/path.ts";

const definition = path.join(repositoryRoot, WORKSPACE_DEFINITION);

const workspaceParents: readonly string[] = listedPackageParents({
  definition,
  definitionYaml: readTextFile(definition) ?? "",
});

const workspaceParentPattern = workspaceParents.map(escapeRegExp).join("|");

export { workspaceParentPattern, workspaceParents };
