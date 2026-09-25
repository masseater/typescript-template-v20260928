import { NodeServices } from "@effect/platform-node";
import {
  UnlistableWorkspace,
  workspaceMembers,
  type WorkspaceMember,
} from "@repo/config/workspace-members";
import { Effect } from "effect";

import { paths } from "./host.ts";

const unprovidedDependencies = (
  members: readonly WorkspaceMember[],
  byPackageName: ReadonlyMap<string, WorkspaceMember>,
): readonly string[] =>
  members.flatMap((member) =>
    member.workspaceDependencies
      .filter((dependencyName) => !byPackageName.has(dependencyName))
      .map(
        (dependencyName) =>
          `${member.packageName} depends on ${dependencyName}, which no workspace package provides`,
      ),
  );

const reachableFrom = (
  reached: ReadonlySet<string>,
  byPackageName: ReadonlyMap<string, WorkspaceMember>,
): ReadonlySet<string> => {
  const widened = new Set([
    ...reached,
    ...[...reached].flatMap(
      (packageName) => byPackageName.get(packageName)?.workspaceDependencies ?? [],
    ),
  ]);
  return widened.size === reached.size ? reached : reachableFrom(widened, byPackageName);
};

const rangesOf = (
  members: readonly WorkspaceMember[],
  byPackageName: ReadonlyMap<string, WorkspaceMember>,
): ReadonlyMap<string, readonly string[]> =>
  new Map(
    members.map((member) => {
      const reached = reachableFrom(new Set([member.packageName]), byPackageName);
      return [
        member.directory,
        members
          .filter((candidate) => reached.has(candidate.packageName))
          .map((candidate) => candidate.directory),
      ];
    }),
  );

const workspaceDependencyRanges = Effect.fn("workspaceDependencyRanges")(
  function* workspaceDependencyRanges(root: string) {
    const members = yield* workspaceMembers(root).pipe(Effect.provide(NodeServices.layer));
    const byPackageName = new Map(members.map((member) => [member.packageName, member]));
    const unprovided = unprovidedDependencies(members, byPackageName);
    if (unprovided.length > 0) {
      return yield* new UnlistableWorkspace({
        definition: paths.join(root, "pnpm-workspace.yaml"),
        reason: unprovided.join("; "),
      });
    }
    return rangesOf(members, byPackageName);
  },
);

export { workspaceDependencyRanges };
