import { Schema } from "effect";

class VerifyCommandFailure extends Schema.TaggedError<VerifyCommandFailure>()(
  "VerifyCommandFailure",
  {
    cause: Schema.optionalKey(Schema.Defect()),
    reason: Schema.Literals([
      "command_unsupported",
      "credentials_invalid",
      "browser_start_failed",
      "browser_authentication_failed",
    ]),
  },
) {}

const failure = (reason: VerifyCommandFailure["reason"], cause?: unknown): VerifyCommandFailure => {
  return new VerifyCommandFailure(cause === undefined ? { reason } : { cause, reason });
};

export { failure };
export type { VerifyCommandFailure };
