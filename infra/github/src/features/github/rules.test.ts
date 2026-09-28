import { NodeServices } from "@effect/platform-node";
import { repositoryRoot } from "@repo/config/repository-root";
import { Effect, FileSystem, Path, Schema } from "effect";
import { describe, expect, test } from "vite-plus/test";
import { parse } from "yaml";

import { mainBranchRuleset, requiredPullRequestChecks } from "./rules.ts";

const MergifyQueues = Schema.Struct({
  queue_rules: Schema.Array(Schema.Struct({ queue_conditions: Schema.Array(Schema.Unknown) })),
});

describe("mainBranchRuleset", () => {
  const it = test.extend("acmeRuleset", () =>
    mainBranchRuleset({ owner: "acme", repository: "widgets" }));

  it("lets only the merge queue update main, after a pull request whose check passed", ({
    acmeRuleset,
  }) => {
    expect(acmeRuleset).toStrictEqual({
      bypassActors: [{ actorType: "Integration", actorId: 10_562, bypassMode: "always" }],
      conditions: { include: ["refs/heads/main"] },
      enforcement: "active",
      name: "main",
      owner: "acme",
      repository: "widgets",
      rules: {
        deletion: true,
        nonFastForward: true,
        pullRequest: { requiredApprovingReviewCount: 0 },
        requiredStatusChecks: { checks: [{ context: "check" }] },
        update: true,
      },
      target: "branch",
    });
  });
});

describe("requiredPullRequestChecks", () => {
  const it = test.extend("queueChecks", () =>
    Effect.runPromise(
      Effect.gen(function* readQueueChecks() {
        const filesystem = yield* FileSystem.FileSystem;
        const paths = yield* Path.Path;
        const config = yield* Schema.decodeUnknownEffect(MergifyQueues)(
          parse(yield* filesystem.readFileString(paths.join(repositoryRoot, ".mergify.yml"))),
        );
        return config.queue_rules
          .flatMap((rule) => rule.queue_conditions)
          .flatMap((condition) =>
            typeof condition === "string" && condition.startsWith("check-success = ")
              ? [condition.slice("check-success = ".length)]
              : [],
          );
      }).pipe(Effect.orDie, Effect.provide(NodeServices.layer)),
    ));

  it("are exactly the checks the merge queue waits for before a pull request enters it", ({
    queueChecks,
  }) => {
    expect(queueChecks).toStrictEqual([...requiredPullRequestChecks]);
  });
});
