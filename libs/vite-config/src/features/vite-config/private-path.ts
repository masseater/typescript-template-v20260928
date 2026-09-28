import { buildTargets, hostOf, type BuildTarget } from "@repo/config";

import { paths } from "./host.ts";
import { deniedDatabaseFiles, deniedDatabaseSpecifiers } from "./private-database-modules.ts";

const applicationsExcept = (application: BuildTarget): BuildTarget[] =>
  buildTargets.filter(
    (candidate) => candidate !== application && candidate !== hostOf(application),
  );

const hostPrivatePath = (slashedPath: string, application: BuildTarget): boolean => {
  const host = hostOf(application);
  return (
    host !== application &&
    new RegExp(`(?:^|/)apps/${host}/(?!content(?:/|$))`, "u").test(slashedPath)
  );
};

const secretFileName = /^(?:\.env.*|\.dev\.vars.*|.*\.(?:pem|key))$/u;

const isSecretFileName = (fileName: string): boolean => secretFileName.test(fileName);

const privateDatabasePath = (slashedPath: string, application: BuildTarget): boolean =>
  deniedDatabaseFiles(application).some(
    (databaseFile) => slashedPath === databaseFile || slashedPath.endsWith(`/${databaseFile}`),
  ) ||
  deniedDatabaseSpecifiers(application).some(
    (specifier) => slashedPath.endsWith(specifier) || slashedPath.includes(`${specifier}/`),
  );

const privatePath = ({
  application,
  candidatePath,
  repositoryRoot,
}: Readonly<{
  application: BuildTarget;
  candidatePath: string;
  repositoryRoot: string;
}>): boolean => {
  const slashedPath = candidatePath.replaceAll("\\", "/");
  const repositoryRelativePath = paths.relative(repositoryRoot, slashedPath).replaceAll("\\", "/");
  const foreignApplications = applicationsExcept(application).join("|");
  return (
    /^(?:infra|tools)(?:\/|$)/u.test(repositoryRelativePath) ||
    new RegExp(`(?:^|/)apps/(?:${foreignApplications})(?:/|$)`, "u").test(slashedPath) ||
    new RegExp(`@repo/(?:${foreignApplications})(?:/|$)`, "u").test(slashedPath) ||
    /(?:^|\/)(?:\.local(?:-agents)?|\.git)(?:\/|$)|-test-fixture\.[^/]*$/u.test(slashedPath) ||
    isSecretFileName(slashedPath.split("/").at(-1) ?? slashedPath) ||
    privateDatabasePath(slashedPath, application) ||
    hostPrivatePath(slashedPath, application)
  );
};

export { applicationsExcept, isSecretFileName, privatePath };
