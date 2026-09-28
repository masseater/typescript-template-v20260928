import { jobEntriesOf } from "../steps.ts";
import {
  entriesOf,
  entryOf,
  keyOf,
  lineOf,
  scalarValueText,
  type WorkflowDocument,
} from "../workflow-document.ts";

import type { Pair } from "yaml";
import type { RepositoryProblem } from "../../problem.ts";
import type { WorkflowChecksConfig } from "../config.ts";

const overSharedPermissions = ({
  document,
  config,
  workflowPermissions,
}: {
  readonly document: WorkflowDocument;
  readonly config: WorkflowChecksConfig;
  readonly workflowPermissions: Pair;
}): readonly RepositoryProblem[] => {
  if (jobEntriesOf({ document, config }).length < 2) return [];
  const scopes = entriesOf(workflowPermissions.value);
  const granted =
    scopes.length === 0
      ? [
          {
            node: workflowPermissions.value,
            name: scalarValueText(workflowPermissions.value) ?? "",
          },
        ]
      : scopes
          .filter((scope) => {
            const name = keyOf(scope);
            return name === null || config.sharedPermissions[name] !== scalarValueText(scope.value);
          })
          .map((scope) => ({ node: scope.key, name: keyOf(scope) ?? "" }));
  return granted.map(({ node, name }) => ({
    file: document.relativePath,
    line: lineOf(document, node),
    message: `A workflow with more than one job must not grant ${name} to all of them, because every job then holds a token that only some of them use. Keep only ${Object.entries(
      config.sharedPermissions,
    )
      .map(([scope, level]) => `${scope}: ${level}`)
      .join(", ")} on the workflow and declare ${name} on the jobs that use it.`,
  }));
};

export const undeclaredPermissions = ({
  document,
  config,
}: {
  readonly document: WorkflowDocument;
  readonly config: WorkflowChecksConfig;
}): readonly RepositoryProblem[] => {
  const workflowPermissions = entryOf(document.root, config.permissionsKey);
  if (workflowPermissions !== null) {
    return overSharedPermissions({ document, config, workflowPermissions });
  }

  return jobEntriesOf({ document, config }).flatMap((job) => {
    if (entryOf(job.value, config.permissionsKey) !== null) return [];

    return [
      {
        file: document.relativePath,
        line: lineOf(document, job.key),
        message: `A job must not run on whatever the platform hands it by default, because declaring nothing records that the permissions were never examined rather than that they were found sufficient. Declare ${config.permissionsKey} on this workflow or on the job ${keyOf(job) ?? ""}, naming only what the run reads or writes.`,
      },
    ];
  });
};
