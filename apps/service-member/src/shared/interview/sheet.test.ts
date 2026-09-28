import { Result } from "effect";
import { assert, describe, expect, it } from "vite-plus/test";

import { readValue } from "./sheet.ts";

const NICKNAME_LIMIT = 30;

describe("readValue", () => {
  it("reads an answer that fits the field", () => {
    expect.hasAssertions();
    const read = readValue("interests", ["音楽、料理"]);
    assert(Result.isSuccess(read));
    expect(read.success).toStrictEqual({ interests: ["音楽", "料理"] });
  });

  it("fails with the field when the answer does not fit, instead of reading nothing", () => {
    expect.hasAssertions();
    const tooLong = readValue("nickname", ["あ".repeat(NICKNAME_LIMIT + 1)]);
    const blank = readValue("area", ["   "]);
    assert(Result.isFailure(tooLong) && Result.isFailure(blank));
    expect([tooLong.failure.field, blank.failure.field]).toStrictEqual(["nickname", "area"]);
  });
});
