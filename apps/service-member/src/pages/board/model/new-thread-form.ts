import { useAction } from "@repo/ui";
import { useForm, useStore } from "@tanstack/react-form";
import { Effect } from "effect";

import { openThread } from "#pages/board/api/board.ts";

import type { SubmitEventHandler } from "react";

function createThread(
  title: string,
  body: string,
  onCreated: (threadId: string) => Promise<void>,
): Promise<void> {
  return Effect.runPromise(
    Effect.gen(function* publishThread() {
      const threadId = yield* Effect.promise(() => openThread(title, body));
      yield* Effect.promise(() => onCreated(threadId));
    }),
  );
}

interface NewThreadForm {
  readonly blocked: boolean;
  readonly body: string;
  readonly error: string | undefined;
  readonly handleBodyChange: (value: string) => void;
  readonly handleSubmit: SubmitEventHandler<HTMLFormElement>;
  readonly handleTitleChange: (value: string) => void;
  readonly pending: boolean;
  readonly title: string;
}

function useNewThreadForm(onCreated: (threadId: string) => Promise<void>): NewThreadForm {
  const action = useAction();
  const form = useForm({
    defaultValues: { body: "", title: "" },
    onSubmit: ({ value }) => {
      action.run(() => createThread(value.title, value.body, onCreated));
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
    handleSubmit: (event) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    handleTitleChange: (value) => {
      form.setFieldValue("title", value);
    },
    pending: action.pending,
    title: values.title,
  };
}

export { useNewThreadForm };
