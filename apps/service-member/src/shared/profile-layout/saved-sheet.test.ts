import { Effect, Exit } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { readSavedSheet } from "./saved-sheet.ts";

describe("readSavedSheet", () => {
  describe("a stored sheet with its layout", () => {
    const it = test.extend("theStoredSheet", () =>
      Effect.runSyncExit(
        readSavedSheet({
          layout: { blocks: [{ kind: "identity" }] },
          sheet: { nickname: "たろう" },
        }),
      ));

    it("is read as stored", ({ theStoredSheet }) => {
      expect(theStoredSheet).toStrictEqual(
        Exit.succeed({ layout: { blocks: [{ kind: "identity" }] }, sheet: { nickname: "たろう" } }),
      );
    });
  });

  describe("a bare sheet without its layout", () => {
    const it = test.extend("theBareSheetFailure", () =>
      Effect.runSyncExit(
        readSavedSheet({ nickname: "たろう" }).pipe(Effect.mapError((failure) => failure._tag)),
      ));

    it("fails as a database failure", ({ theBareSheetFailure }) => {
      expect(theBareSheetFailure).toStrictEqual(Exit.fail("DatabaseFailure"));
    });
  });
});
