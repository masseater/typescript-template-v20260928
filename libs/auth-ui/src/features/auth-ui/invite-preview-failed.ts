import { Schema } from "effect";

class InvitePreviewFailed extends Schema.TaggedError<InvitePreviewFailed>()("InvitePreviewFailed", {
  status: Schema.Finite,
}) {}

export { InvitePreviewFailed };
