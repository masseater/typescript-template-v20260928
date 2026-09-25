import { DatabaseFailure } from "@repo/db";
import { Effect, Schema } from "effect";

import { Sheet } from "#shared/interview/sheet.ts";
import { ProfileLayout } from "./schema.ts";

import type { SheetData } from "#shared/interview/sheet.ts";
import type { ProfileLayoutData } from "./schema.ts";

const StoredSheet = Schema.Struct({
  layout: ProfileLayout,
  sheet: Sheet,
});

const decodeStored = Schema.decodeUnknownEffect(StoredSheet);

function readSavedSheet(saved: unknown): Effect.Effect<typeof StoredSheet.Type, DatabaseFailure> {
  return decodeStored(saved).pipe(Effect.mapError((cause) => new DatabaseFailure({ cause })));
}

const encodeStored = Schema.encodeEffect(StoredSheet);

function writeSavedSheet(
  sheet: SheetData,
  layout: ProfileLayoutData,
): Effect.Effect<typeof StoredSheet.Type, Schema.SchemaError> {
  return encodeStored({ layout, sheet });
}

export { readSavedSheet, writeSavedSheet };
