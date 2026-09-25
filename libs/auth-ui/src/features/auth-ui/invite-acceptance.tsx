import { FormColumn, STATUS_VARIANT, StatusMessage, TextLink, localState } from "@repo/ui";
import { type ReactElement } from "react";

import { InviteForm } from "./invite-form.tsx";
import { type Invitation } from "./invite-preview.ts";

const useAccepted = localState(false);

const unavailableMessage = (
  invitation: Exclude<Invitation, Readonly<{ status: "available" }>>,
): string => {
  switch (invitation.status) {
    case "closed": {
      return "招待が無効か、有効期限が切れています。招待した人に再送を依頼してください。";
    }
    case "failed": {
      return `招待を確認できませんでした（HTTP ${invitation.responseStatus}）。時間をおいて再度お試しください。`;
    }
    case "unreachable": {
      return "サーバーに接続できず、招待を確認できませんでした。通信環境を確かめて再度お試しください。";
    }
  }
};

const InviteAcceptance = ({
  endpoint,
  invitation,
  token,
}: Readonly<{ endpoint: string; invitation: Invitation; token: string }>): ReactElement => {
  const [accepted, setAccepted] = useAccepted();
  if (accepted) {
    return (
      <FormColumn>
        <StatusMessage variant={STATUS_VARIANT.success}>
          {"アカウントを作成しました。設定したパスワードでログインしてください。"}
        </StatusMessage>
        <TextLink to="/login">{"ログインへ"}</TextLink>
      </FormColumn>
    );
  }
  if (invitation.status !== "available") {
    return (
      <StatusMessage variant={STATUS_VARIANT.failure}>
        {unavailableMessage(invitation)}
      </StatusMessage>
    );
  }
  const markAccepted = (): void => {
    setAccepted(true);
  };
  return (
    <InviteForm
      email={invitation.email}
      endpoint={endpoint}
      token={token}
      onAccepted={markAccepted}
    />
  );
};

export { InviteAcceptance };
