import { httpStatus } from "@repo/config";

const verificationVerdicts = ["verified", "invalid", "rateLimited", "unconfirmed"] as const;
type VerificationVerdict = (typeof verificationVerdicts)[number];
const VERIFICATION_VERDICT = {
  invalid: verificationVerdicts[1],
  rateLimited: verificationVerdicts[2],
  unconfirmed: verificationVerdicts[3],
  verified: verificationVerdicts[0],
} as const satisfies Record<string, VerificationVerdict>;


const verificationVerdictOf = (status: number | undefined): VerificationVerdict => {
  if (status === undefined) {
    return VERIFICATION_VERDICT.unconfirmed;
  }
  if (status >= httpStatus.ok && status < httpStatus.multipleChoices) {
    return VERIFICATION_VERDICT.verified;
  }
  if (status === httpStatus.badRequest) {
    return VERIFICATION_VERDICT.invalid;
  }
  if (status === httpStatus.tooManyRequests) {
    return VERIFICATION_VERDICT.rateLimited;
  }
  return VERIFICATION_VERDICT.unconfirmed;
};

const settledVerdicts: ReadonlySet<VerificationVerdict> = new Set([
  VERIFICATION_VERDICT.invalid,
  VERIFICATION_VERDICT.verified,
]);

const isSettledVerdict = (verdict: VerificationVerdict): boolean => settledVerdicts.has(verdict);

const retryMessages: Readonly<Partial<Record<VerificationVerdict, string>>> = {
  [VERIFICATION_VERDICT.rateLimited]:
    "確認の回数が多すぎます。しばらく待ってから、もう一度確認してください。",
  [VERIFICATION_VERDICT.unconfirmed]:
    "確認できませんでした。通信の状態を確かめてから、もう一度確認してください。",
};

const retryMessageOf = (verdict: VerificationVerdict): string | undefined => retryMessages[verdict];

export { VERIFICATION_VERDICT, isSettledVerdict, retryMessageOf, verificationVerdictOf };
export type { VerificationVerdict };
