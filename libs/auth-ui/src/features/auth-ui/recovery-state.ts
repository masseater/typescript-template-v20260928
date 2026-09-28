import { Option, Schema } from "effect";

/** @canonical-values ui.recovery-state */
const recoveryStates = ["1", "setup"] as const;

type RecoveryState = (typeof recoveryStates)[number];

const RECOVERY_STATE = { recovered: recoveryStates[0], setup: recoveryStates[1] } as const;

const recoveryQueryKey = "recovery";

const decodeRecoveryState = Schema.decodeUnknownOption(Schema.Literals(recoveryStates));

const recoveryStateOf = (search: string): RecoveryState | undefined =>
  Option.getOrUndefined(decodeRecoveryState(new URLSearchParams(search).get(recoveryQueryKey)));

const recoveryUrl = (path: "/login" | "/security", recovery: RecoveryState): string =>
  `${path}?${new URLSearchParams({ [recoveryQueryKey]: recovery }).toString()}`;

export { RECOVERY_STATE, recoveryStateOf, recoveryUrl };
export type { RecoveryState };
