import { Schema } from "effect";

class LastAdminRequired extends Schema.TaggedError<LastAdminRequired>()("LastAdminRequired", {
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

export { LastAdminRequired };
