import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { recoveryOfferOptions } from "#pages/recovery/api/recovery.ts";
import { RecoveryChoice } from "#pages/recovery/ui/recovery-choice.tsx";
import { RecoveryPending } from "#pages/recovery/ui/recovery-status.tsx";

import type { ReactElement } from "react";

function WelcomeRecoveryPage({
  nextPath,
}: Readonly<{
  nextPath: "/welcome/agreement" | "/welcome/choose" | "/welcome/interview" | "/welcome/profile";
}>): ReactElement {
  const navigate = useNavigate();
  const { data: offer } = useSuspenseQuery(recoveryOfferOptions);
  if (!offer.available) {
    return <RecoveryPending />;
  }
  return (
    <RecoveryChoice
      previousName={offer.previousName}
      onDecided={() => {
        void navigate({ to: nextPath });
      }}
    />
  );
}

export { WelcomeRecoveryPage };
