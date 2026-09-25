import { Schema } from "effect";

class PhotoMissing extends Schema.TaggedError<PhotoMissing>()("PhotoMissing", {
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

export { PhotoMissing };
