import { Config, ConfigProvider, Effect, Path } from "effect";

import { optionalConfig } from "./optional-config.ts";

const localDatabaseVariable = "TEMPLATE_LOCAL_DATABASE";
const paths = Effect.runSync(Path.Path.pipe(Effect.provide(Path.layer)));
const repositoryDirectory = paths.join(import.meta.dirname, "../../../../../.local/d1");

const localDatabase = {
  binding: "DB",
  database_id: "00000000-0000-0000-0000-000000000001",
  database_name: "template-shared",
};

const localDatabaseDirectory = (): string => {
  const override = Effect.runSync(
    optionalConfig(Config.String(localDatabaseVariable)).pipe(
      Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv()),
    ),
  );
  return override === undefined || override === "" ? repositoryDirectory : paths.resolve(override);
};

const localDatabasePersistence = localDatabaseDirectory();

export { localDatabase, localDatabaseDirectory, localDatabasePersistence, localDatabaseVariable };
