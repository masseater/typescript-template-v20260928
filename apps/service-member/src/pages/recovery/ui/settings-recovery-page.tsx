import { Page, StatusMessage } from "@repo/ui";
import { useSuspenseQuery } from "@tanstack/react-query";

import { recoveryOfferOptions } from "#pages/recovery/api/recovery.ts";
import { RecoveryChoice } from "#pages/recovery/ui/recovery-choice.tsx";

import type { ReactElement } from "react";

function SettingsRecoveryPage(): ReactElement {
  const { data: offer } = useSuspenseQuery(recoveryOfferOptions);
  if (!offer.available) {
    return (
      <Page title="データの復旧">
        <StatusMessage>いま復旧できる過去のデータはありません。</StatusMessage>
      </Page>
    );
  }
  return <RecoveryChoice previousName={offer.previousName} onDecided={() => undefined} />;
}

export { SettingsRecoveryPage };
