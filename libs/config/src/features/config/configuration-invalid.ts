import { Schema } from "effect";

class ConfigurationInvalid extends Schema.TaggedError<ConfigurationInvalid>()(
  "ConfigurationInvalid",
  { cause: Schema.optionalKey(Schema.Defect()), reason: Schema.String },
) {}

export { ConfigurationInvalid };
