#!/usr/bin/env node
import * as NodeServices from "@effect/platform-node/NodeServices";
import { causeRecord, reportFailed, runCli } from "@repo/cli";
import { Effect, FileSystem, Schema } from "effect";
import { ChildProcess } from "effect/unstable/process";

import { capturedProcess } from "./captured-process.ts";
import { ROUTE_TREE, routeTreeDrifted } from "./route-tree-drift.ts";

class CommittedRouteTreeUnreadable extends Schema.TaggedError<CommittedRouteTreeUnreadable>()(
  "CommittedRouteTreeUnreadable",
  { stderr: Schema.String },
) {
  public override get message(): string {
    return `git show HEAD:./${ROUTE_TREE} failed: ${this.stderr}`;
  }
}

runCli(
  Effect.gen(function* routeTree() {
    const filesystem = yield* FileSystem.FileSystem;
    const shown = yield* capturedProcess(
      ChildProcess.make("git", ["show", `HEAD:./${ROUTE_TREE}`], { stdin: "ignore" }),
    );
    if (shown.exitCode !== 0) {
      return yield* new CommittedRouteTreeUnreadable({ stderr: shown.stderr });
    }
    const drifted = yield* routeTreeDrifted({
      committed: shown.stdout,
      regenerated: yield* filesystem.readFileString(ROUTE_TREE),
    });
    if (drifted) {
      yield* reportFailed({
        event: "route-tree-drift",
        ok: false,
        file: ROUTE_TREE,
        message: `The build regenerated ${ROUTE_TREE} with content the commit does not carry. Run the build and commit the regenerated file with the route change.`,
      });
    }
  }).pipe(Effect.provide(NodeServices.layer)),
  (cause) => causeRecord("route-tree-drift", { cause }),
);
