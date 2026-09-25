import { Schema } from "effect";

class SessionRequired extends Schema.TaggedError<SessionRequired>()("SessionRequired", {
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

export { SessionRequired };
