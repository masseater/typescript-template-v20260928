import { Effect } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { LocalCommandFailure } from "./failure.ts";
import { sessionState } from "./local-environment.ts";

describe("reading tmux has-session", () => {
  it.for([
    ["can't find session: member", false],
    ["no server running on /tmp/tmux-0/template-000000000000", false],
    ["error connecting to /tmp/tmux-0/template-000000000000 (No such file or directory)", false],
  ] as const)("reads %s as a session that is not running", ([errors, runningState]) => {
    expect.assertions(1);
    expect(Effect.runSync(sessionState(1, errors))).toBe(runningState);
  });

  it("reads a zero exit as a running session", () => {
    expect(Effect.runSync(sessionState(0, ""))).toBe(true);
  });

  it("fails with what tmux printed when it could not answer", () => {
    expect(
      Effect.runSync(
        Effect.flip(
          sessionState(
            1,
            "error connecting to /tmp/tmux-0/template-000000000000 (Permission denied)",
          ),
        ),
      ),
    ).toStrictEqual(
      new LocalCommandFailure({
        cause:
          "tmux has-session exited with 1: error connecting to /tmp/tmux-0/template-000000000000 (Permission denied)",
        reason: "process_failed",
      }),
    );
  });
});
