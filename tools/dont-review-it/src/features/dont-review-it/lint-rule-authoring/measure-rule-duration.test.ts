import { describe, expect, test, vi } from "vite-plus/test";

import { measureVisitor } from "./measure-rule-duration.ts";

const RULE_NAME = "no-example--do-something";

const VISITED_NODE = { type: "Identifier", name: "alpha" };

const telemetryDouble = (started: boolean) => {
  const record = vi.fn<(elapsed: number, attributes: { readonly rule: string }) => void>();
  return { record, telemetry: { started: () => started, duration: () => ({ record }) } };
};

describe("measureVisitor", () => {
  describe("telemetry that is not running", () => {
    describe("the visitor it hands back", () => {
      const it = test.extend("idleVisitor", () => {
        const visitor = { VisitedNode: vi.fn<(node: unknown) => void>() };
        return {
          visitor,
          handed: measureVisitor({
            ruleName: RULE_NAME,
            visitor,
            telemetry: telemetryDouble(false).telemetry,
          }),
        };
      });

      it("is the very visitor it was given", ({ idleVisitor }) => {
        expect(idleVisitor.handed).toBe(idleVisitor.visitor);
      });
    });

    describe("the recorder behind a handler that was visited", () => {
      const it = test.extend("idleRecorder", () => {
        const idle = telemetryDouble(false);
        const handed = measureVisitor({
          ruleName: RULE_NAME,
          visitor: { VisitedNode: vi.fn<(node: unknown) => void>() },
          telemetry: idle.telemetry,
        });
        (handed.VisitedNode as (node: unknown) => unknown)(VISITED_NODE);
        return idle.record;
      });

      it("is never asked to record anything", ({ idleRecorder }) => {
        expect(idleRecorder).not.toHaveBeenCalled();
      });
    });
  });

  describe("telemetry that is running", () => {
    describe("the handler the measured visitor wraps", () => {
      const it = test.extend("wrappedHandler", () => {
        const visitedNodeHandler = vi.fn<(node: unknown) => void>();
        const running = measureVisitor({
          ruleName: RULE_NAME,
          visitor: { VisitedNode: visitedNodeHandler },
          telemetry: telemetryDouble(true).telemetry,
        });
        (running.VisitedNode as (node: unknown) => unknown)(VISITED_NODE);
        return visitedNodeHandler;
      });

      it("is still called with the node the visit carried", ({ wrappedHandler }) => {
        expect(wrappedHandler).toHaveBeenCalledExactlyOnceWith(VISITED_NODE);
      });
    });

    describe("the duration recorded for a visit", () => {
      const it = test.extend("runningRecorder", () => {
        const running = telemetryDouble(true);
        const measured = measureVisitor({
          ruleName: RULE_NAME,
          visitor: { VisitedNode: vi.fn<(node: unknown) => void>() },
          telemetry: running.telemetry,
        });
        (measured.VisitedNode as (node: unknown) => unknown)(VISITED_NODE);
        return running.record;
      });

      it("is recorded once under the rule's name", ({ runningRecorder }) => {
        expect(runningRecorder).toHaveBeenCalledExactlyOnceWith(expect.any(Number), {
          rule: RULE_NAME,
        });
      });
    });

    describe("what a visit through the measured visitor returns", () => {
      const it = test.extend("wrappedHandlerAnswer", () => {
        const running = measureVisitor({
          ruleName: RULE_NAME,
          visitor: { VisitedNode: () => false },
          telemetry: telemetryDouble(true).telemetry,
        });
        return (running.VisitedNode as (node: unknown) => unknown)(VISITED_NODE);
      });

      it("is what the wrapped handler returned", ({ wrappedHandlerAnswer }) => {
        expect(wrappedHandlerAnswer).toBe(false);
      });
    });

    describe("a visitor declaring a handler that was left undefined", () => {
      const it = test.extend("measuredHandlerNames", () =>
        Object.keys(
          measureVisitor({
            ruleName: RULE_NAME,
            visitor: { VisitedNode: vi.fn<(node: unknown) => void>(), MissingNode: undefined },
            telemetry: telemetryDouble(true).telemetry,
          }),
        ));

      it("keeps only the handler that was defined", ({ measuredHandlerNames }) => {
        expect(measuredHandlerNames).toStrictEqual(["VisitedNode"]);
      });
    });
  });
});
