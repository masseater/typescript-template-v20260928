import { Effect, Option } from "effect";

import { bashCommandOf, malformedBashInputReason } from "../bash-command.ts";
import { resolvePath } from "../host.ts";
import { findWorktreeAdds, unresolvedWord, type WorktreeAdd } from "./find-worktree-adds.ts";
import {
  insideRepositoryReason,
  unconfirmedRepositoryReason,
  unresolvedDestinationReason,
} from "./message.ts";

import type { WorktreeHomeFailure } from "./git.ts";

export type WorktreeGuardInquiry = Readonly<{
  cwd: string;
  home: string;
  repositoryRootOf: (directory: string) => Effect.Effect<string | undefined, WorktreeHomeFailure>;
  toolInput: unknown;
  toolName: string;
}>;

const isLiteral = (word: string): boolean =>
  word !== unresolvedWord && !word.includes("$") && !word.includes("`");

const expandedHome = (word: string, home: string): string =>
  word === "~" || word.startsWith("~/") ? `${home}${word.slice(1)}` : word;

const isWithin = (candidate: string, root: string): boolean =>
  candidate === root || candidate.startsWith(`${root}/`);

const reasonForAdd = (
  worktreeAdd: WorktreeAdd,
  inquiry: WorktreeGuardInquiry,
): Effect.Effect<string | undefined> => {
  const words = [...worktreeAdd.directories, worktreeAdd.target ?? unresolvedWord];
  if (!words.every(isLiteral)) {
    return Effect.succeed(unresolvedDestinationReason);
  }
  const base = resolvePath(
    inquiry.cwd,
    ...worktreeAdd.directories.map((directory) => expandedHome(directory, inquiry.home)),
  );
  const destination = resolvePath(base, expandedHome(worktreeAdd.target ?? "", inquiry.home));
  return inquiry.repositoryRootOf(base).pipe(
    Effect.map((repositoryRoot) =>
      repositoryRoot !== undefined && isWithin(destination, repositoryRoot)
        ? insideRepositoryReason(destination, repositoryRoot)
        : undefined,
    ),
    Effect.catchTag("WorktreeHomeFailure", (failure) =>
      Effect.succeed(unconfirmedRepositoryReason(failure.message)),
    ),
  );
};

export const denyReasonOf = (inquiry: WorktreeGuardInquiry): Effect.Effect<string | undefined> => {
  if (inquiry.toolName !== "Bash") return Effect.succeed(undefined);
  return Option.match(bashCommandOf(inquiry.toolInput), {
    onNone: () => Effect.succeed(`worktree-home: ${malformedBashInputReason}`),
    onSome: (command) =>
      Effect.forEach(findWorktreeAdds(command), (worktreeAdd) =>
        reasonForAdd(worktreeAdd, inquiry),
      ).pipe(Effect.map((reasons) => reasons.find((reason) => reason !== undefined))),
  });
};
