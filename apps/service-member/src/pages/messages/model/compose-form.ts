import { useAction } from "@repo/ui";
import { useForm, useStore } from "@tanstack/react-form";

import { openConversation } from "#pages/messages/api/messages.ts";

interface ComposeForm {
  readonly blocked: boolean;
  readonly body: string;
  readonly error: string | undefined;
  readonly handleBodyChange: (value: string) => void;
  readonly handleSubmit: (event: Readonly<{ preventDefault: () => void }>) => void;
  readonly pending: boolean;
}

function useComposeForm(
  peerId: string,
  onOpened: (conversationId: string) => Promise<void>,
  onPaidRequired: () => Promise<void>,
): ComposeForm {
  const action = useAction();
  const form = useForm({
    defaultValues: { body: "" },
    onSubmit: ({ formApi, value }) => {
      action.run(() =>
        openConversation(peerId, value.body).then((opened) => {
          if (opened.paidRequired) {
            return onPaidRequired();
          }
          formApi.reset();
          return onOpened(opened.conversationId);
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

export { useComposeForm };
