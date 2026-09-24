import { describe, expect, test } from "vite-plus/test";

import { stringEntriesOf } from "./record-fields.ts";

describe("stringEntriesOf", () => {
  describe("a record holding a nested value beside a specifier", () => {
    const it = test.extend("specifierPairs", () =>
      stringEntriesOf({ kept: "^1.0.0", dropped: { nested: true } }));

    it("keeps the entries whose declared specifier is a string", ({ specifierPairs }) => {
      expect(specifierPairs).toStrictEqual([["kept", "^1.0.0"]]);
    });
  });

  describe("something that is not a record", () => {
    const it = test.extend("specifierPairs", () => stringEntriesOf(undefined));

    it("reads as no entries", ({ specifierPairs }) => {
      expect(specifierPairs).toStrictEqual([]);
    });
  });
});
