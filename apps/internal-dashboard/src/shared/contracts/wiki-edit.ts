import { photoContentTypes } from "@repo/config";
import { Schema } from "effect";

const maximumPathLength = 200;

const WikiPagePath = Schema.String.check(
  Schema.isMaxLength(maximumPathLength),
  Schema.isPattern(/^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*\.md$/u),
);

const DraftVersion = Schema.Finite.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0));

const WikiSourceQuery = Schema.Struct({ path: WikiPagePath });

const WikiSource = Schema.Struct({
  baseRevision: Schema.NullOr(Schema.String),
  draft: Schema.NullOr(
    Schema.Struct({
      publishedUrl: Schema.NullOr(Schema.String),
      updatedAt: Schema.DateFromString,
      version: DraftVersion,
    }),
  ),
  markdown: Schema.String,
  path: WikiPagePath,
  publishable: Schema.Boolean,
});
type WikiSource = typeof WikiSource.Type;

const WikiDraftSave = Schema.Struct({
  baseRevision: Schema.NullOr(Schema.String),
  markdown: Schema.String,
  path: WikiPagePath,
  version: DraftVersion,
});

const WikiDraftReference = Schema.Struct({ path: WikiPagePath, version: DraftVersion });



const WikiDraftSaved = Schema.Struct({ version: DraftVersion });

const wikiImageTypes = ["image/gif", ...photoContentTypes] as const;

const WikiImageUpload = Schema.Struct({
  bytes: Schema.Uint8ArrayFromBase64,
  contentType: Schema.Literals(wikiImageTypes),
});


export {
  WikiDraftReference,
  WikiDraftSave,
  WikiDraftSaved,
  WikiImageUpload,
  WikiSource,
  WikiSourceQuery,
  wikiImageTypes,
};
