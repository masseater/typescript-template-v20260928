import { Schema } from "effect";

class BootstrapUnavailable extends Schema.TaggedError<BootstrapUnavailable>()(
  "BootstrapUnavailable",
  {},
) {}

export { BootstrapUnavailable };
