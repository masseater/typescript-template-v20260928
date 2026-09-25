import { dependencyFieldSchemas } from "@repo/config/workspace-members";
import { Cause, Exit, Schema } from "effect";

export const PackageManifest = Schema.Struct({
  name: Schema.optionalKey(Schema.String),
  ...dependencyFieldSchemas,
  exports: Schema.optionalKey(Schema.Unknown),
  main: Schema.optionalKey(Schema.String),
  types: Schema.optionalKey(Schema.String),
  typings: Schema.optionalKey(Schema.String),
  bin: Schema.optionalKey(
    Schema.Union([Schema.String, Schema.Record(Schema.String, Schema.String)]),
  ),
  scripts: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  workspaces: Schema.optionalKey(Schema.Unknown),
  engines: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
  lintRules: Schema.optionalKey(Schema.Array(Schema.String)),
  normativeDocuments: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
});

export type PackageManifest = typeof PackageManifest.Type;

const decodeManifest = Schema.decodeUnknownExit(PackageManifest);

export const packageManifestFrom = ({
  declared,
  source,
}: {
  readonly declared: unknown;
  readonly source: string;
}): PackageManifest => {
  const decoded = decodeManifest(declared);
  if (Exit.isSuccess(decoded)) return decoded.value;
  const mismatch = Cause.squash(decoded.cause);
  throw new Error(`${source} does not match the package manifest schema: ${String(mismatch)}`, {
    cause: mismatch,
  });
};
