import { APPLICATION, type BuildTarget } from "@repo/config";

const databaseSourceDirectory = "libs/db/src/features/db";

type PrivateDatabaseModule = Readonly<{
  files: readonly string[];
  readers: readonly BuildTarget[];
  subpath: string;
}>;

const privateDatabaseModules: readonly PrivateDatabaseModule[] = [
  {
    files: [
      "admin.ts",
      "agreement-admin.ts",
      "agreement-version-taken.ts",
      "last-admin-required.ts",
      "trust-admin.ts",
    ],
    readers: [APPLICATION.admin],
    subpath: "./admin",
  },
  { files: ["bootstrap-statement.ts"], readers: [], subpath: "./bootstrap" },
  {
    files: ["bootstrap-statement.ts", "remote-operations.ts"],
    readers: [],
    subpath: "./migrations",
  },
  {
    files: ["bootstrap-statement.ts", "database-test-fixture.ts", "records-test-fixture.ts"],
    readers: [],
    subpath: "./testing",
  },
];

const deniedDatabaseModules = (application: BuildTarget): readonly PrivateDatabaseModule[] =>
  privateDatabaseModules.filter((module) => !module.readers.includes(application));

const deniedDatabaseFiles = (application: BuildTarget): readonly string[] => [
  ...new Set(
    deniedDatabaseModules(application).flatMap((module) =>
      module.files.map((file) => `${databaseSourceDirectory}/${file}`),
    ),
  ),
];

const deniedDatabaseSpecifiers = (application: BuildTarget): readonly string[] =>
  deniedDatabaseModules(application).map((module) => `@repo/db/${module.subpath.slice(2)}`);

export {
  databaseSourceDirectory,
  deniedDatabaseFiles,
  deniedDatabaseSpecifiers,
  privateDatabaseModules,
};
export type { PrivateDatabaseModule };
