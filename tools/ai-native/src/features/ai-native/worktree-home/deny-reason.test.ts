import { Effect } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { malformedBashInputReason } from "../bash-command.ts";
import { denyReasonOf } from "./deny-reason.ts";
import { gitOutput, repositoryRootOf, type GitRunner } from "./git.ts";
import {
  insideRepositoryReason,
  unconfirmedRepositoryReason,
  unresolvedDestinationReason,
} from "./message.ts";

const failingGit: GitRunner = () =>
  Effect.succeed({ status: 128, stderr: "fatal: not a git repository", stdout: "" });

describe("denyReasonOf", () => {
  const it = test
    .extend("nestedReason", () =>
      Effect.runSync(
        denyReasonOf({
          cwd: "/repo",
          home: "/home/dev",
          repositoryRootOf: (directory) =>
            Effect.succeed(
              directory === "/repo" || directory.startsWith("/repo/") ? "/repo" : undefined,
            ),
          toolInput: { command: "git worktree add .claude/worktrees/x" },
          toolName: "Bash",
        }),
      ))
    .extend("directoryNestedReason", () =>
      Effect.runSync(
        denyReasonOf({
          cwd: "/elsewhere",
          home: "/home/dev",
          repositoryRootOf: (directory) =>
            Effect.succeed(
              directory === "/repo" || directory.startsWith("/repo/") ? "/repo" : undefined,
            ),
          toolInput: { command: "git -C /repo worktree add wt" },
          toolName: "Bash",
        }),
      ),
    )
    .extend("outsideReason", () =>
      Effect.runSync(
        denyReasonOf({
          cwd: "/repo",
          home: "/home/dev",
          repositoryRootOf: (directory) =>
            Effect.succeed(
              directory === "/repo" || directory.startsWith("/repo/") ? "/repo" : undefined,
            ),
          toolInput: { command: "git worktree add ~/worktrees/github.com/acme/widgets/x" },
          toolName: "Bash",
        }),
      ),
    )
    .extend("siblingReason", () =>
      Effect.runSync(
        denyReasonOf({
          cwd: "/repo",
          home: "/home/dev",
          repositoryRootOf: (directory) =>
            Effect.succeed(
              directory === "/repo" || directory.startsWith("/repo/") ? "/repo" : undefined,
            ),
          toolInput: { command: "git worktree add ../repo-x" },
          toolName: "Bash",
        }),
      ),
    )
    .extend("variableReason", () =>
      Effect.runSync(
        denyReasonOf({
          cwd: "/repo",
          home: "/home/dev",
          repositoryRootOf: (directory) =>
            Effect.succeed(
              directory === "/repo" || directory.startsWith("/repo/") ? "/repo" : undefined,
            ),
          toolInput: { command: 'git worktree add "$TARGET"' },
          toolName: "Bash",
        }),
      ),
    )
    .extend("missingPathReason", () =>
      Effect.runSync(
        denyReasonOf({
          cwd: "/repo",
          home: "/home/dev",
          repositoryRootOf: (directory) =>
            Effect.succeed(
              directory === "/repo" || directory.startsWith("/repo/") ? "/repo" : undefined,
            ),
          toolInput: { command: "git worktree add -b x" },
          toolName: "Bash",
        }),
      ),
    )
    .extend("outsideRepositoryReason", () =>
      Effect.runSync(
        denyReasonOf({
          cwd: "/tmp",
          home: "/home/dev",
          repositoryRootOf: (directory) =>
            Effect.succeed(
              directory === "/repo" || directory.startsWith("/repo/") ? "/repo" : undefined,
            ),
          toolInput: { command: "git worktree add x" },
          toolName: "Bash",
        }),
      ),
    )
    .extend("otherToolReason", () =>
      Effect.runSync(
        denyReasonOf({
          cwd: "/repo",
          home: "/home/dev",
          repositoryRootOf: (directory) =>
            Effect.succeed(
              directory === "/repo" || directory.startsWith("/repo/") ? "/repo" : undefined,
            ),
          toolInput: { command: "git worktree add .claude/worktrees/x" },
          toolName: "Write",
        }),
      ),
    )
    .extend("malformedInputReason", () =>
      Effect.runSync(
        denyReasonOf({
          cwd: "/repo",
          home: "/home/dev",
          repositoryRootOf: (directory) =>
            Effect.succeed(
              directory === "/repo" || directory.startsWith("/repo/") ? "/repo" : undefined,
            ),
          toolInput: { command: 42 },
          toolName: "Bash",
        }),
      ),
    )
    .extend("gitFailureReason", () =>
      Effect.runSync(
        denyReasonOf({
          cwd: "/repo",
          home: "/home/dev",
          repositoryRootOf: (directory) => repositoryRootOf(failingGit, directory),
          toolInput: { command: "git worktree add .claude/worktrees/x" },
          toolName: "Bash",
        }),
      ),
    )
    .extend("theGitFailure", () =>
      Effect.runSync(
        Effect.flip(
          gitOutput(failingGit, {
            cwd: "/repo",
            handed: ["rev-parse", "--path-format=absolute", "--git-common-dir"],
          }),
        ),
      ),
    );

  it("refuses a worktree inside the repository", ({ nestedReason }) => {
    expect(nestedReason).toBe(insideRepositoryReason("/repo/.claude/worktrees/x", "/repo"));
  });

  it("resolves the path against -C before judging it", ({ directoryNestedReason }) => {
    expect(directoryNestedReason).toBe(insideRepositoryReason("/repo/wt", "/repo"));
  });

  it("allows a worktree under the home worktrees directory", ({ outsideReason }) => {
    expect(outsideReason).toBe(undefined);
  });

  it("allows a sibling of the repository whose name shares its prefix", ({ siblingReason }) => {
    expect(siblingReason).toBe(undefined);
  });

  it("refuses a path it cannot read literally", ({ variableReason }) => {
    expect(variableReason).toBe(unresolvedDestinationReason);
  });

  it("refuses an add whose path is missing", ({ missingPathReason }) => {
    expect(missingPathReason).toBe(unresolvedDestinationReason);
  });

  it("allows an add git places in no working tree", ({ outsideRepositoryReason }) => {
    expect(outsideRepositoryReason).toBe(undefined);
  });

  it("ignores tools other than Bash", ({ otherToolReason }) => {
    expect(otherToolReason).toBe(undefined);
  });

  it("refuses a Bash input without a command string", ({ malformedInputReason }) => {
    expect(malformedInputReason).toBe(`worktree-home: ${malformedBashInputReason}`);
  });

  it("refuses an add when git cannot name the repository", ({
    gitFailureReason,
    theGitFailure,
  }) => {
    expect(gitFailureReason).toBe(unconfirmedRepositoryReason(theGitFailure.message));
  });
});
