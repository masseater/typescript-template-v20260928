import { Schema } from "effect";

class WikiPublishFailed extends Schema.TaggedError<WikiPublishFailed>()("WikiPublishFailed", {
  cause: Schema.optionalKey(Schema.Defect()),
  message: Schema.String,
  status: Schema.Finite,
  step: Schema.String,
}) {}

export { WikiPublishFailed };
