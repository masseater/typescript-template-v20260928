import { Schema } from "effect";

class LastEditorRequired extends Schema.TaggedError<LastEditorRequired>()("LastEditorRequired", {
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

export { LastEditorRequired };
