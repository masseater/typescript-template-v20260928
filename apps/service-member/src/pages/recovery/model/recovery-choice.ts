import { useAction } from "@repo/ui";
import { useQueryClient } from "@tanstack/react-query";

import {
  acceptRecovery,
  declineRecovery,
  recoveryOfferOptions,
} from "#pages/recovery/api/recovery.ts";
interface RecoveryChoiceState {
  readonly blocked: boolean;
  readonly error: string;
  readonly handleAccept: () => void;
  readonly handleDecline: () => void;
  readonly pending: boolean;
}
function useRecoveryChoice(onDecided: () => void): RecoveryChoiceState {
  const action = useAction();
  const queries = useQueryClient();
  function settle(decide: () => Promise<unknown>): Promise<void> {
    return decide()
      .then(() => queries.invalidateQueries({ queryKey: recoveryOfferOptions.queryKey }))
      .then(() => onDecided());
  }
  function handleAccept(): void {
    action.run(() => settle(acceptRecovery));
  }
  function handleDecline(): void {
    action.run(() => settle(declineRecovery));
  }
  return {
    blocked: action.blocked,
    error: action.error ?? "",
    handleAccept,
    handleDecline,
    pending: action.pending,
  };
}
export { useRecoveryChoice };
