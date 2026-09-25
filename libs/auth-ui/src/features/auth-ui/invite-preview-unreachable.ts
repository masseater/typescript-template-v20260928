import { Schema } from "effect";

class InvitePreviewUnreachable extends Schema.TaggedError<InvitePreviewUnreachable>()(
  "InvitePreviewUnreachable",
  { cause: Schema.Defect() },
) {}

export { InvitePreviewUnreachable };
