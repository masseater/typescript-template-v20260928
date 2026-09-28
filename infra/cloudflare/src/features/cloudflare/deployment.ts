import { homedir } from "node:os";

import { optionalSetting } from "@repo/config/process-environment";

import { ENVIRONMENT_FILE_VARIABLE } from "./environment-file-variable.ts";
import { path } from "./platform.ts";

const nonEmptySetting = (variable: string): string | undefined => {
  const configured = optionalSetting(variable);
  return configured === "" ? undefined : configured;
};

const environmentFile = (): string | undefined => nonEmptySetting(ENVIRONMENT_FILE_VARIABLE);

const secretsFileConfigured = (): boolean => environmentFile() !== undefined;

const configurationHome = (project: string): string =>
  path.join(nonEmptySetting("XDG_CONFIG_HOME") ?? path.join(homedir(), ".config"), project);

const ENVIRONMENT_FILE_NAME = "cloudflare.env";

const secretsFile = (project: string): string => {
  const configured = environmentFile();
  return configured === undefined
    ? path.join(configurationHome(project), ENVIRONMENT_FILE_NAME)
    : path.resolve(configured);
};

export { secretsFile, secretsFileConfigured };
