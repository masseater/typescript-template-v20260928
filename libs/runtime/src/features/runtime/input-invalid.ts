import { Schema } from "effect";
class InputInvalid extends Schema.TaggedError<InputInvalid>()("InputInvalid", {
  cause: Schema.optionalKey(Schema.Defect()),
}) {}
export { InputInvalid };
