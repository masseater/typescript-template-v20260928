import { Schema } from "effect";

class RecoveryUnavailable extends Schema.TaggedError<RecoveryUnavailable>()("RecoveryUnavailable", {
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

export { RecoveryUnavailable };
