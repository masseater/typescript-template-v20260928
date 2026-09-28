import { ruleDuration, startLintTelemetry } from "./lint-telemetry.ts";

import type { Visitor } from "@oxlint/plugins";

type DurationRecorder = {
  readonly record: (elapsed: number, attributes: { readonly rule: string }) => void;
};

type RuleTelemetry = {
  readonly started: () => boolean;
  readonly duration: () => DurationRecorder;
};

const lintTelemetry: RuleTelemetry = {
  started: startLintTelemetry,
  duration: ruleDuration,
};

const measured = ({
  ruleName,
  handler,
  duration,
}: {
  readonly ruleName: string;
  readonly handler: (...args: readonly never[]) => unknown;
  readonly duration: RuleTelemetry["duration"];
}): ((...args: readonly never[]) => unknown) => {
  return (...handed) => {
    const startedAt = performance.now();
    const handled = handler(...handed);
    duration().record(performance.now() - startedAt, { rule: ruleName });
    return handled;
  };
};

export const measureVisitor = ({
  ruleName,
  visitor,
  telemetry = lintTelemetry,
}: {
  readonly ruleName: string;
  readonly visitor: Visitor;
  readonly telemetry?: RuleTelemetry;
}): Visitor => {
  if (!telemetry.started()) {
    return visitor;
  }
  return Object.fromEntries(
    Object.entries(visitor).flatMap(([nodeType, visiting]) =>
      visiting === undefined
        ? []
        : [
            [
              nodeType,
              measured({ ruleName, handler: visiting, duration: telemetry.duration }),
            ] as const,
          ],
    ),
  );
};
