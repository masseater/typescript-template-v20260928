import { Schema } from "effect";

class EmailDeliveryFailed extends Schema.TaggedError<EmailDeliveryFailed>()("EmailDeliveryFailed", {
  cause: Schema.optionalKey(Schema.Defect()),
  reason: Schema.Literals(["origin_mismatch", "rejected", "unreachable"]),
}) {}

export { EmailDeliveryFailed };
