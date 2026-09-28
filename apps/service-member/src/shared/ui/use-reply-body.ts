import { useAction } from "@repo/ui";
import { useForm, useStore } from "@tanstack/react-form";

import type { ReplyBodyFormState } from "./reply-body-form.tsx";

function useReplyBody(
  send: (body: string) => Promise<unknown>,
  onSent: () => Promise<void> | void,
): ReplyBodyFormState {
  const action = useAction();
  const form = useForm({
    defaultValues: { body: "" },
    onSubmit: ({ formApi, value }) => {
      action.run(() =>
        send(value.body).then(() => {
          formApi.reset();
          return onSent();
        }),
      );
    },
  });
  const body = useStore(form.store, (state) => state.values.body);
  return {
    blocked: action.blocked,
    body,
    error: action.error,
    handleBodyChange: (value) => {
      form.setFieldValue("body", value);
    },
    handleSubmit: (event) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    pending: action.pending,
  };
}

export { useReplyBody };
