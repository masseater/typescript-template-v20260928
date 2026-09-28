import { httpStatus } from "@repo/config";
import { describe, expect, test } from "vite-plus/test";

import {
  VERIFICATION_VERDICT,
  isSettledVerdict,
  verificationVerdictOf,
} from "./verification-verdict.ts";

describe("the verdict of an email verification request", () => {
  test.for([
    [httpStatus.ok, VERIFICATION_VERDICT.verified, true],
    [httpStatus.badRequest, VERIFICATION_VERDICT.invalid, true],
    [httpStatus.tooManyRequests, VERIFICATION_VERDICT.rateLimited, false],
    [httpStatus.serviceUnavailable, VERIFICATION_VERDICT.unconfirmed, false],
    [httpStatus.internalServerError, VERIFICATION_VERDICT.unconfirmed, false],
    [undefined, VERIFICATION_VERDICT.unconfirmed, false],
  ] as const)("classifies %o as %s, settled: %s", ([status, verdict, settled]) => {
    expect(verificationVerdictOf(status)).toBe(verdict);
    expect(isSettledVerdict(verdict)).toBe(settled);
  });
});
