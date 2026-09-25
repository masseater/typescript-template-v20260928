import { Schema } from "effect";

class WikiPageInvalid extends Schema.TaggedError<WikiPageInvalid>()("WikiPageInvalid", {
  cause: Schema.optionalKey(Schema.Defect()),
}) {}

export { WikiPageInvalid };
