const filteredRunArguments = (
  workspace: string,
  task: string,
  ...rest: readonly string[]
): readonly string[] => ["run", "--filter", workspace, "--fail-if-no-match", task, ...rest];

const filteredRunCommand = (workspace: string, task: string, ...rest: readonly string[]): string =>
  ["vp", ...filteredRunArguments(workspace, task, ...rest)].join(" ");

export { filteredRunArguments, filteredRunCommand };
