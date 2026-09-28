import { useAction } from "@repo/ui";
import { useForm, useStore } from "@tanstack/react-form";
import { Effect } from "effect";

import { registerPerson } from "#pages/recordings/api/recordings.ts";

import type { PersonForm } from "./recording-state.ts";

function register(
  name: string,
  consented: boolean,
  onRegistered: () => Promise<void>,
): Promise<void> {
  return Effect.runPromise(
    Effect.gen(function* registerSpeaker() {
      if (!consented) {
        return yield* Effect.die(new Error("本人の同意を確認してください。"));
      }
      yield* Effect.promise(() => registerPerson(name));
      yield* Effect.promise(() => onRegistered());
    }),
  );
}

function usePersonForm(onRegistered: () => Promise<void>): PersonForm {
  const action = useAction();
  const form = useForm({
    defaultValues: { consented: false, name: "" },
    onSubmit: ({ formApi, value }) => {
      action.run(() =>
        register(value.name, value.consented, () =>
          onRegistered().then(() => {
            formApi.reset();
          }),
        ),
      );
    },
  });
  const values = useStore(form.store, (state) => state.values);
  return {
    blocked: action.blocked,
    consented: values.consented,
    error: action.error,
    handleConsentChange: (consented) => {
      form.setFieldValue("consented", consented);
    },
    handleNameChange: (name) => {
      form.setFieldValue("name", name);
    },
    handleSubmit: (event) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    name: values.name,
    pending: action.pending,
  };
}

export { usePersonForm };
