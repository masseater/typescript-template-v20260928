import { useAction } from "@repo/ui";
import { useForm, useStore } from "@tanstack/react-form";

import { createInquiry } from "#pages/support/api/support.ts";

import type { SubmitEventHandler } from "react";

interface NewInquiryForm {
  readonly blocked: boolean;
  readonly body: string;
  readonly error: string | undefined;
  readonly handleBodyChange: (value: string) => void;
  readonly handleSubjectChange: (value: string) => void;
  readonly handleSubmit: SubmitEventHandler<HTMLFormElement>;
  readonly pending: boolean;
  readonly subject: string;
}

function useNewInquiryForm(onCreated: (inquiryId: string) => void): NewInquiryForm {
  const action = useAction();
  const form = useForm({
    defaultValues: { body: "", subject: "" },
    onSubmit: ({ value }) => {
      action.run(() => createInquiry(value).then((created) => onCreated(created.id)));
    },
  });
  const values = useStore(form.store, (state) => state.values);
  return {
    blocked: action.blocked,
    body: values.body,
    error: action.error,
    handleBodyChange: (value) => {
      form.setFieldValue("body", value);
    },
    handleSubjectChange: (value) => {
      form.setFieldValue("subject", value);
    },
    handleSubmit: (event) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    pending: action.pending,
    subject: values.subject,
  };
}

export { useNewInquiryForm };
