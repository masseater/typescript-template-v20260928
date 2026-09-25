import { Schema } from "effect";

class ApiFailed extends Schema.TaggedError<ApiFailed>()("ApiFailed", {
  cause: Schema.optionalKey(Schema.Defect()),
  code: Schema.optionalKey(Schema.String),
  detail: Schema.optionalKey(Schema.String),
  reason: Schema.Literals(["rejected", "response_invalid", "response_empty"]),
  requestId: Schema.optionalKey(Schema.String),
  status: Schema.optionalKey(Schema.Finite),
}) {}

export { ApiFailed };
