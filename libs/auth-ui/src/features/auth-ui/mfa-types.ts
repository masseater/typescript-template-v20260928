import { type ActionState } from "@repo/ui";

import type { SessionView } from "./protocol";
import type { RecoveryState } from "./recovery-state.ts";

type Enrollment = {
  readonly totpURI: string;
  readonly backupCodes: readonly string[];
};

type PasskeySummary = {
  readonly id: string;
  readonly name?: string | null | undefined;
};

type SettingsContext = {
  readonly action: ActionState;
  readonly recovery: RecoveryState | undefined;
  readonly session: SessionView;
  readonly onNotice: (notice: string) => void;
  readonly onNoticeClear: () => void;
};

export type { Enrollment, PasskeySummary, SettingsContext };
