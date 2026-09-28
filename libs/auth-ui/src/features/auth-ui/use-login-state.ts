import { localState } from "@repo/ui";
import { useForm, useStore } from "@tanstack/react-form";
import { Option } from "effect";

import type { ChallengeMode } from "./challenge-modes.ts";
import type { TextInput } from "./text-input.ts";

const useChallenge = localState(Option.none<ChallengeMode>());

const useLoginState = (): {
  readonly challenge: ChallengeMode | undefined;
  readonly email: TextInput;
  readonly handleChallenge: (challengeMode: ChallengeMode) => void;
  readonly handleRestart: () => void;
  readonly password: TextInput;
} => {
  const textForm = useForm({ defaultValues: { email: "", password: "" } });
  const texts = useStore(textForm.store, (state) => state.values);
  const email: TextInput = {
    handleChange: (next) => {
      textForm.setFieldValue("email", next);
    },
    value: texts.email,
  };
  const password: TextInput = {
    handleChange: (next) => {
      textForm.setFieldValue("password", next);
    },
    value: texts.password,
  };
  const [challenge, setChallenge] = useChallenge();
  const handleChallenge = (challengeMode: ChallengeMode): void => {
    setChallenge(Option.some(challengeMode));
  };
  const handleRestart = (): void => {
    setChallenge(Option.none());
    email.handleChange("");
    password.handleChange("");
  };
  return {
    challenge: Option.getOrUndefined(challenge),
    email,
    handleChallenge,
    handleRestart,
    password,
  };
};

export { useLoginState };
