import { Button, STATUS_VARIANT, StatusMessage } from "@repo/ui";
import { useQuery } from "@tanstack/react-query";
import { useEffect, type ReactElement } from "react";

import { emailVerificationOptions } from "./api/verify-email.ts";
import { VERIFICATION_VERDICT, retryMessageOf } from "./verification-verdict.ts";
import { forgetSettledToken } from "./verify-email-token.ts";

const EmailVerification = (): ReactElement => {
  const verification = useQuery(emailVerificationOptions);
  const verdict = verification.data;
  useEffect(() => {
    if (verdict === undefined) {
      return;
    }
    if (verdict === VERIFICATION_VERDICT.verified) {
      globalThis.location.replace("/login");
      return;
    }
    forgetSettledToken(verdict);
  }, [verdict]);
  if (verdict === VERIFICATION_VERDICT.invalid) {
    return (
      <StatusMessage variant={STATUS_VARIANT.failure}>
        {"確認リンクが無効か、有効期限が切れています。ログインして確認メールを再送してください。"}
      </StatusMessage>
    );
  }
  const retryMessage = verdict === undefined ? undefined : retryMessageOf(verdict);
  if (retryMessage !== undefined && !verification.isFetching) {
    return (
      <>
        <StatusMessage variant={STATUS_VARIANT.failure}>{retryMessage}</StatusMessage>
        <Button
          type="button"
          onClick={() => {
            void verification.refetch();
          }}
        >
          {"もう一度確認する"}
        </Button>
      </>
    );
  }
  return (
    <StatusMessage variant={STATUS_VARIANT.pending}>
      {"メールアドレスを確認しています。"}
    </StatusMessage>
  );
};

export { EmailVerification };
