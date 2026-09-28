import preview from "../../../storybook/preview";
import { PasskeyRegisterForm } from "./passkey-register-form";
import { RECOVERY_STATE } from "./recovery-state.ts";
import { settingsContext } from "./settings-context-test-fixture";

const meta = preview.meta({
  args: {
    context: settingsContext(),
    onRegistered: (): Promise<void> => Promise.resolve(),
  },
  component: PasskeyRegisterForm,
});

export const Default = meta.story();

export const RecoveringAdmin = meta.story({
  args: {
    context: settingsContext({
      recovery: RECOVERY_STATE.recovered,
      strong: false,
      user: { role: "admin" },
    }),
  },
});
