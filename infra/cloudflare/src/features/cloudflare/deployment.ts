import { homedir } from "node:os";

import { optionalSetting } from "@repo/config/process-environment";

import { path } from "./platform.ts";

const ENVIRONMENT_FILE_VARIABLE = "TEMPLATE_CLOUDFLARE_ENV_FILE";

const nonEmptySetting = (variable: string): string | undefined => {
  const configured = optionalSetting(variable);
  return configured === "" ? undefined : configured;
};

const environmentFile = (): string | undefined => nonEmptySetting(ENVIRONMENT_FILE_VARIABLE);

const secretsFileConfigured = (): boolean => environmentFile() !== undefined;

const ENVIRONMENT_FILE_NAME = "cloudflare.env";

type SecretsFileSettings = {
  readonly project: string;
  readonly environmentFile: string | undefined;
  readonly configurationHome: string | undefined;
  readonly homeDirectory: string;
};

const secretsFileLocation = (settings: SecretsFileSettings): string =>
  settings.environmentFile === undefined
    ? path.join(
        settings.configurationHome ?? path.join(settings.homeDirectory, ".config"),
        settings.project,
        ENVIRONMENT_FILE_NAME,
      )
    : path.resolve(settings.environmentFile);

const secretsFile = (project: string): string =>
  secretsFileLocation({
    project,
    environmentFile: environmentFile(),
    configurationHome: nonEmptySetting("XDG_CONFIG_HOME"),
    homeDirectory: homedir(),
  });

export { ENVIRONMENT_FILE_VARIABLE, secretsFile, secretsFileConfigured, secretsFileLocation };
