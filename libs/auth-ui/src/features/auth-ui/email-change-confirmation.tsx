import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Button, StatusMessage, STATUS_VARIANT, requestAtom, resultError } from "@repo/ui";
import { Effect } from "effect";
import { AsyncResult } from "effect/unstable/reactivity";

import { authTask } from "./browser-http.ts";
import { VERIFICATION_VERDICT, retryMessageOf } from "./verification-verdict.ts";
import { forgetSettledToken, verifyEmailToken } from "./verify-email-token.ts";

import type { ReactElement } from "react";

const confirmEmailChange = Effect.gen(function* confirmChangedEmail() {
  const verdict = yield* authTask(() => verifyEmailToken());
  forgetSettledToken(verdict);
  return verdict;
});

const confirmationAtom = requestAtom(() => Effect.runPromise(confirmEmailChange));

const EmailChangeConfirmation = ({ retryHref }: Readonly<{ retryHref: string }>): ReactElement => {
  const confirmation = useAtomValue(confirmationAtom);
  const confirmAgain = useAtomRefresh(confirmationAtom);
  const failure = resultError(confirmation);
  if (failure !== undefined) {
    return <StatusMessage variant={STATUS_VARIANT.failure}>{failure}</StatusMessage>;
  }
  if (!AsyncResult.isSuccess(confirmation) || confirmation.waiting) {
    return (
      <StatusMessage variant={STATUS_VARIANT.pending}>
        {"新しいメールアドレスを確認しています。"}
      </StatusMessage>
    );
  }
  if (confirmation.value === VERIFICATION_VERDICT.verified) {
    return (
      <>
        <StatusMessage variant={STATUS_VARIANT.success}>
          {"メールアドレスを変更しました。次回からは新しいメールアドレスでログインしてください。"}
        </StatusMessage>
        <a href="/login">{"ログイン"}</a>
      </>
    );
  }
  const retryMessage = retryMessageOf(confirmation.value);
  if (retryMessage !== undefined) {
    return (
      <>
        <StatusMessage variant={STATUS_VARIANT.failure}>{retryMessage}</StatusMessage>
        <Button type="button" onClick={confirmAgain}>
          {"もう一度確認する"}
        </Button>
      </>
    );
  }
  return (
    <>
      <StatusMessage variant={STATUS_VARIANT.failure}>
        {
          "確認リンクが無効か、有効期限が切れています。もう一度メールアドレスの変更を申請してください。"
        }
      </StatusMessage>
      <a href={retryHref}>{"メールアドレスの変更へ"}</a>
      <a href="/login">{"ログイン"}</a>
    </>
  );
};

export { EmailChangeConfirmation };
