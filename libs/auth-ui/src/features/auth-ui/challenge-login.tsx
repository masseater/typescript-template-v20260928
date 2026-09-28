import { type ActionState, Button } from "@repo/ui";
import { useForm, useStore } from "@tanstack/react-form";

import { ChallengeForm } from "./challenge-form";
import { CHALLENGE_MODE, type ChallengeMode } from "./challenge-modes.ts";

import type { ReactElement } from "react";
import type { AuthenticatedHandler } from "./authenticated-handler";
import type { TextInput } from "./text-input.ts";

const ChallengeLogin = ({
  action,
  mode,
  onAuthenticated,
  onModeChange,
  onRestart,
}: {
  readonly action: ActionState;
  readonly mode: ChallengeMode;
  readonly onAuthenticated: AuthenticatedHandler;
  readonly onModeChange: (mode: ChallengeMode) => void;
  readonly onRestart: () => void;
}): ReactElement => {
  const textForm = useForm({ defaultValues: { code: "" } });
  const texts = useStore(textForm.store, (state) => state.values);
  const code: TextInput = {
    handleChange: (next) => {
      textForm.setFieldValue("code", next);
    },
    value: texts.code,
  };
  const toggleMode = (): void => {
    onModeChange(mode === CHALLENGE_MODE.backup ? CHALLENGE_MODE.totp : CHALLENGE_MODE.backup);
    code.handleChange("");
  };
  const restart = (): void => {
    onRestart();
    code.handleChange("");
  };
  return (
    <>
      <ChallengeForm action={action} code={code} mode={mode} onAuthenticated={onAuthenticated} />
      <Button type="button" disabled={action.blocked} onClick={toggleMode}>
        {mode === CHALLENGE_MODE.backup ? "認証アプリのコードを使う" : "バックアップコードを使う"}
      </Button>
      <Button type="button" disabled={action.blocked} onClick={restart}>
        {"ログイン方法を選び直す"}
      </Button>
    </>
  );
};

export { ChallengeLogin };
