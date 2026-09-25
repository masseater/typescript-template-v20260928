import { describe } from "vite-plus/test";

import { testLintRule } from "../../../../lint-rule-authoring/rule-tester-test-fixture.ts";
import { noDroppedCause } from "./no-dropped-cause--pass-the-failure-as-cause.ts";

describe("dont-review-it/no-dropped-cause--pass-the-failure-as-cause", () => {
  testLintRule(noDroppedCause, {
    valid: [
      {
        name: "mapping a failure into a new one that carries it as cause keeps the chain",
        documented: true,
        code: "const read = load.pipe(Effect.mapError((cause) => new ReadFailed({ cause })));",
      },
      {
        name: "a try object whose catch carries the failure as cause keeps the chain",
        documented: true,
        code: "const sent = Effect.tryPromise({\n  catch: (cause) => new SendFailed({ cause, reason: 'unreachable' }),\n  try: () => send(),\n});",
      },
      {
        name: "naming the cause under another parameter name is still carrying it",
        code: "const read = load.pipe(Effect.mapError((error) => new ReadFailed({ cause: error })));",
      },
      {
        name: "handing the failure whole to the builder of the new failure keeps it",
        code: "const read = load.pipe(Effect.mapError((cause) => failed('read_failed', cause)));",
      },
      {
        name: "a builder passed by name that carries its parameter as cause keeps the chain",
        code: "const ioFailed = (cause) => new IoFailed({ cause });\nconst read = load.pipe(Effect.mapError(ioFailed));",
      },
      {
        name: "a builder declared as a function that carries its parameter keeps the chain",
        code: "function ioFailed(cause) {\n  return new IoFailed({ cause });\n}\nconst read = Effect.tryPromise({ catch: ioFailed, try: () => load() });",
      },
      {
        name: "a builder imported from another module cannot be read and is left alone",
        code: "import { ioFailed } from './io.ts';\nconst read = load.pipe(Effect.mapError(ioFailed));",
      },
      {
        name: "a factory whose returned function carries the failure keeps the chain",
        code: "const failedAt = (step) => (cause) => new StepFailed({ cause, step });\nconst read = load.pipe(Effect.mapError(failedAt('read')));",
      },
      {
        name: "a catch property in an object without try is not a try object",
        code: "const handlers = { catch: () => undefined, finally: () => undefined };",
      },
      {
        name: "passing the failure through unchanged on one branch keeps it",
        code: "const saved = save.pipe(\n  Effect.mapError((failure) => (isConflict(failure) ? new Conflict({ cause: failure }) : failure)),\n);",
      },
      {
        name: "a catch that hands back what it caught keeps it",
        code: "const sent = Effect.tryPromise({ catch: (cause) => cause, try: () => send() });",
      },
      {
        name: "the data-first form reads the function from the last argument",
        code: "const read = Effect.mapError(load, (cause) => new ReadFailed({ cause }));",
      },
    ],
    invalid: [
      {
        name: "mapping a failure into a new one without receiving it is reported",
        documented: true,
        code: "const read = load.pipe(Effect.mapError(() => new ReadFailed()));",
        errors: [{ messageId: "droppedCause" }],
      },
      {
        name: "a try object whose catch ignores what it caught is reported",
        documented: true,
        code: "const sent = Effect.tryPromise({\n  catch: () => new SendFailed({ reason: 'unreachable' }),\n  try: () => send(),\n});",
        errors: [{ messageId: "droppedCause" }],
      },
      {
        name: "receiving the failure and keeping only its text is reported",
        code: "const read = load.pipe(Effect.mapError((cause) => new ReadFailed({ detail: String(cause) })));",
        errors: [{ messageId: "droppedCause" }],
      },
      {
        name: "receiving the failure and keeping only its message is reported",
        code: "const read = load.pipe(Effect.mapError((cause) => new ReadFailed({ message: cause.message })));",
        errors: [{ messageId: "droppedCause" }],
      },
      {
        name: "receiving the failure under a pattern that takes one field is reported",
        code: "const read = load.pipe(Effect.mapError(({ code }) => new ReadFailed({ code })));",
        errors: [{ messageId: "droppedCause" }],
      },
      {
        name: "a builder passed by name that takes no failure is reported",
        code: "const httpFailed = () => new HttpFailed();\nconst read = load.pipe(Effect.mapError(httpFailed));",
        errors: [{ messageId: "droppedCause" }],
      },
      {
        name: "a factory whose returned function takes no failure is reported",
        code: "const failedAt = (step) => () => new StepFailed({ step });\nconst read = Effect.tryPromise({ catch: failedAt('read'), try: () => load() });",
        errors: [{ messageId: "droppedCause" }],
      },
      {
        name: "a builder that turns the failure into text is reported",
        code: "const asWriteFailure = (cause) => new WriteFailed({ detail: String(cause) });\nconst written = save.pipe(Effect.mapError(asWriteFailure));",
        errors: [{ messageId: "droppedCause" }],
      },
    ],
  });
});
