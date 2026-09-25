import { Schema } from "effect";

class JwksUnavailable extends Schema.TaggedError<JwksUnavailable>()("JwksUnavailable", {
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

export { JwksUnavailable };
