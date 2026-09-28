import { Schema } from "effect";

import { TriggerRefusal, triggerRefusalOf } from "./trigger-refusal.ts";

class DatabaseFailure extends Schema.TaggedError<DatabaseFailure>()("DatabaseFailure", {
  cause: Schema.Defect(),
  refusal: Schema.optionalKey(TriggerRefusal),
}) {
  public static fromDriver(cause: unknown): DatabaseFailure {
    const refusal = triggerRefusalOf(cause);
    return new DatabaseFailure(refusal === undefined ? { cause } : { cause, refusal });
  }
}

export { DatabaseFailure };
