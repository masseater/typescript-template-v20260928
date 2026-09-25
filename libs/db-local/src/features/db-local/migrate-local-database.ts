import { migrateD1 } from "@repo/db/migrations";
import { Effect } from "effect";

import { localDatabasePlatform } from "./local-platform.ts";

const migrateLocalDatabase = Effect.scoped(
  Effect.flatMap(localDatabasePlatform, ({ env }) => migrateD1(env.DB)),
);

export { migrateLocalDatabase };
