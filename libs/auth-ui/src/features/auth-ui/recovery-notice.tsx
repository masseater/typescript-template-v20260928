import { ROLE } from "@repo/config";
import { StatusMessage } from "@repo/ui";

import { RECOVERY_STATE, type RecoveryState } from "./recovery-state.ts";

import type { ReactElement } from "react";
import type { SessionView } from "./protocol";

const RecoveryNotice = ({
  recovery,
  role,
}: {
  readonly recovery: RecoveryState | undefined;
  readonly role: SessionView["user"]["role"];
}): ReactElement | undefined => {
  if (recovery === RECOVERY_STATE.setup) {
    return <StatusMessage>{"新しい認証アプリを登録してください。"}</StatusMessage>;
  }
  if (recovery !== RECOVERY_STATE.recovered) {
    return undefined;
  }
  return (
    <>
      <StatusMessage>{"バックアップコードでログインしました。"}</StatusMessage>
      {role !== ROLE.member ? (
        <StatusMessage>
          {
            "復旧コードでは管理者操作はできません。ログアウト後、登録済みのパスキーまたは認証アプリで\n          ログインしてください。どちらも使えない場合は、この画面から管理者の認証設定を復旧できません。"
          }
        </StatusMessage>
      ) : (
        <StatusMessage>
          {
            "認証アプリを失った場合は、パスワードを入力して古い認証アプリを解除してください。\n          再ログイン後に新しい認証アプリを登録できます。使用済みのバックアップコードは再利用できません。"
          }
        </StatusMessage>
      )}
    </>
  );
};

export { RecoveryNotice };
