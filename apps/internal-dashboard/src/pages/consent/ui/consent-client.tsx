import { CONSENT_CLIENT } from "@repo/auth-ui/consent";
import { Button, STATUS_VARIANT, StatusMessage } from "@repo/ui";

import { useConsentClient } from "#pages/consent/model/consent-client.ts";
import { ConsentActions } from "./consent-actions.tsx";

import type { ReactElement } from "react";

function ConsentClient({ clientId }: Readonly<{ clientId: string }>): ReactElement {
  const consentClient = useConsentClient(clientId);
  const retry = (): void => {
    void consentClient.refetch();
  };
  if (consentClient.isError) {
    return (
      <div className="flex flex-col items-start gap-2">
        <StatusMessage variant={STATUS_VARIANT.failure}>{consentClient.error.message}</StatusMessage>
        <Button onClick={retry} type="button" variant="secondary">
          再試行
        </Button>
      </div>
    );
  }
  if (consentClient.data === undefined || consentClient.data.kind === CONSENT_CLIENT.signInRequired) {
    return <StatusMessage variant={STATUS_VARIANT.pending}>読み込み中です。</StatusMessage>;
  }
  if (consentClient.data.kind === CONSENT_CLIENT.unknown) {
    return (
      <StatusMessage variant={STATUS_VARIANT.failure}>
        連携を求めているクライアントが分かりません。
      </StatusMessage>
    );
  }
  return <ConsentActions client={consentClient.data.name} />;
}

export { ConsentClient };
