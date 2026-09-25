import { Schema } from "effect";

class InviteRejected extends Schema.TaggedError<InviteRejected>()("InviteRejected", {
  cause: Schema.optionalKey(Schema.Defect()),
  reason: Schema.Literals(["missing", "pending", "registered"]),
}) {}

export { InviteRejected };
