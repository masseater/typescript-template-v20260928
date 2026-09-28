import preview from "../../../storybook/preview";
import { RecoveryNotice } from "./recovery-notice";
import { RECOVERY_STATE } from "./recovery-state.ts";

const meta = preview.meta({ component: RecoveryNotice });

export const None = meta.story({ args: { recovery: undefined, role: "member" } });

export const Setup = meta.story({ args: { recovery: RECOVERY_STATE.setup, role: "member" } });

export const RecoveredUser = meta.story({
  args: { recovery: RECOVERY_STATE.recovered, role: "member" },
});

export const RecoveredAdmin = meta.story({
  args: { recovery: RECOVERY_STATE.recovered, role: "admin" },
});
