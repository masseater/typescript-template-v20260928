import { Schema } from "effect";

class StripeEventUnreadable extends Schema.TaggedError<StripeEventUnreadable>()(
  "StripeEventUnreadable",
  { cause: Schema.optionalKey(Schema.Defect()) },
) {}

export { StripeEventUnreadable };
