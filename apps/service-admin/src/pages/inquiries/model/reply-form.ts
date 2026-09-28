import { useAction } from "@repo/ui";
import { useForm, useStore } from "@tanstack/react-form";

import { closeInquiry, replyToInquiry } from "#pages/inquiries/api/inquiries.ts";

import type { SubmitEventHandler } from "react";

interface ReplyForm {
  readonly blocked: boolean;
  readonly body: string;
  readonly error: string | undefined;
  readonly handleBodyChange: (value: string) => void;
  readonly handleClose: () => void;
  readonly handleSubmit: SubmitEventHandler<HTMLFormElement>;
}

function useReplyForm(inquiryId: string, onChanged: () => void): ReplyForm {
  const action = useAction();
  const form = useForm({
    defaultValues: { body: "" },
    onSubmit: ({ formApi, value }) => {
      action.run(() =>
        replyToInquiry({ body: value.body, id: inquiryId }).then(() => {
          formApi.reset();
          onChanged();
        }),
      );
    },
  });
  const body = useStore(form.store, (state) => state.values.body);
  function handleClose(): void {
    action.run(() =>
      closeInquiry(inquiryId).then(() => {
        onChanged();
      }),
    );
  }
  return {
    blocked: action.blocked,
    body,
    error: action.error,
    handleBodyChange: (value) => {
      form.setFieldValue("body", value);
    },
    handleClose,
    handleSubmit: (event) => {
      event.preventDefault();
      void form.handleSubmit();
    },
  };
}

export { useReplyForm };
