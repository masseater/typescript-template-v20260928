import { useAction } from "@repo/ui";
import { useForm, useStore } from "@tanstack/react-form";
import { Effect } from "effect";

import { uploadRecording } from "#pages/recordings/api/recordings.ts";

import type { SubmitEventHandler } from "react";

function upload(
  title: string,
  audio: File | undefined,
  onUploaded: (recordingId: string) => Promise<void>,
): Promise<void> {
  return Effect.runPromise(
    Effect.gen(function* sendRecording() {
      if (audio === undefined) {
        return yield* Effect.die(new Error("録音ファイルを選んでください。"));
      }
      const recordingId = yield* Effect.promise(() => uploadRecording(title, audio));
      yield* Effect.promise(() => onUploaded(recordingId));
    }),
  );
}

interface UploadForm {
  readonly blocked: boolean;
  readonly error: string | undefined;
  readonly handleAudioChange: (audio: File | undefined) => void;
  readonly handleSubmit: SubmitEventHandler<HTMLFormElement>;
  readonly handleTitleChange: (value: string) => void;
  readonly pending: boolean;
  readonly title: string;
}

const blankUpload: Readonly<{ audio: File | undefined; title: string }> = {
  audio: undefined,
  title: "",
};

function useUploadForm(onUploaded: (recordingId: string) => Promise<void>): UploadForm {
  const action = useAction();
  const form = useForm({
    defaultValues: blankUpload,
    onSubmit: ({ value }) => {
      action.run(() => upload(value.title, value.audio, onUploaded));
    },
  });
  const title = useStore(form.store, (state) => state.values.title);
  return {
    blocked: action.blocked,
    error: action.error,
    handleAudioChange: (audio) => {
      form.setFieldValue("audio", audio);
    },
    handleSubmit: (event) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    handleTitleChange: (value) => {
      form.setFieldValue("title", value);
    },
    pending: action.pending,
    title,
  };
}

export { useUploadForm };
