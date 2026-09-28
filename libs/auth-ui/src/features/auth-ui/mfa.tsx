import { useAction, ActionStatus, Heading } from "@repo/ui";

import { PasskeySettings } from "./passkey-settings";
import { RecoveryNotice } from "./recovery-notice";
import { recoveryStateOf, type RecoveryState } from "./recovery-state.ts";
import { TotpSettings } from "./totp-settings";
import { useNotice } from "./use-notice";

import type { ReactElement } from "react";
import type { SettingsContext } from "./mfa-types";
import type { SessionView } from "./protocol";

const readRecovery = (): RecoveryState | undefined => {
  if (!("location" in globalThis)) {
    return undefined;
  }
  return recoveryStateOf(globalThis.location.search);
};

const MFASettings = ({ session }: Readonly<{ session: SessionView }>): ReactElement => {
  const { clearNotice, notice, showNotice } = useNotice();
  const recovery = readRecovery();
  const action = useAction();
  const settingsContext: SettingsContext = {
    action,
    onNotice: showNotice,
    onNoticeClear: clearNotice,
    recovery,
    session,
  };
  return (
    <div className="flex w-full flex-col gap-4">
      <Heading>{"認証アプリとパスキー"}</Heading>
      <RecoveryNotice recovery={recovery} role={session.user.role} />
      <TotpSettings context={settingsContext} />
      <Heading>{"パスキー"}</Heading>
      <PasskeySettings context={settingsContext} />
      <ActionStatus action={action} notice={notice} pendingMessage="認証設定を更新しています。" />
    </div>
  );
};

export { MFASettings };
