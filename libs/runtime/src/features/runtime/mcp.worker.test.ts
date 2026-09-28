import { TestDatabase, runStatement } from "@repo/db/testing";
import { recordingSink } from "@repo/observability/testing";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { Effect, Schema } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { appEnvironment, fixtureOrigin } from "./app-test-fixture.ts";
import { appLayer } from "./bindings.ts";
import { toolRunner } from "./mcp.ts";
import { serveApp, workerRuntime } from "./worker.ts";

import type { AppServices } from "./configured-app-layer.ts";
import type { ToolResult } from "./mcp.ts";

const migrated = Effect.orDie(Effect.provide(runStatement("select 1"), TestDatabase));

class ListedFailure extends Schema.TaggedError<ListedFailure>()("ListedFailure", {}) {}

class UnexpectedFailure extends Schema.TaggedError<UnexpectedFailure>()(
  "UnexpectedFailure",
  {},
) {}

const failureCodes = { ListedFailure: "listed_failure", UnexpectedFailure: "unexpected" } as const;

const toolOutcome = (
  program: Effect.Effect<never, ListedFailure | UnexpectedFailure, AppServices>,
): Promise<{ readonly errorLines: number; readonly result: unknown }> =>
  Effect.runPromise(
    Effect.gen(function* toolOutcomeProgram() {
      yield* migrated;
      const logs = recordingSink();
      const worker = serveApp({
        reporting: { log: logs.sink, service: "service-member" },
        route: () =>
          Effect.gen(function* callTool() {
            const appContext = yield* Effect.context<AppServices>();
            const run = toolRunner(
              <Value>(tool: Effect.Effect<Value, unknown, AppServices>) =>
                Effect.runPromiseWith(appContext)(tool),
              failureCodes,
            );
            const result: ToolResult = yield* Effect.promise(() => run(program));
            return Response.json(result);
          }),
        runtime: workerRuntime(() =>
          appLayer({ audience: "service-member", env: appEnvironment(), routes: { "/": "home" } }),
        ),
      });
      const invocation = createExecutionContext();
      const answered = yield* Effect.promise(() =>
        worker.fetch(new Request(fixtureOrigin), {}, invocation),
      );
      yield* Effect.promise(() => waitOnExecutionContext(invocation));
      const result: unknown = yield* Effect.promise(() => answered.json());
      const errorLines = logs.stderr.filter((line) => line["event"] === "application.error").length;
      return { errorLines, result };
    }),
  );

const operationFailed = { content: [{ text: "operation_failed", type: "text" }], isError: true };

describe("an MCP tool whose handler fails", () => {
  const it = test
    .extend("listed", () => toolOutcome(Effect.fail(new ListedFailure())))
    .extend("unexpected", () => toolOutcome(Effect.fail(new UnexpectedFailure())))
    .extend("defect", () => toolOutcome(Effect.die(new Error("tool defect"))));

  it("answers the listed code without an error log", ({ listed }) => {
    expect(listed).toStrictEqual({
      errorLines: 0,
      result: { content: [{ text: "listed_failure", type: "text" }], isError: true },
    });
  });

  it("logs a failure the table marks unexpected at ERROR and answers operation_failed", ({
    unexpected,
  }) => {
    expect(unexpected).toStrictEqual({ errorLines: 1, result: operationFailed });
  });

  it("logs a defect at ERROR and answers operation_failed", ({ defect }) => {
    expect(defect).toStrictEqual({ errorLines: 1, result: operationFailed });
  });
});
