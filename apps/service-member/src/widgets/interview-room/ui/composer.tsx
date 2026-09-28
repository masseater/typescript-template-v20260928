import { Button, Field } from "@repo/ui";
import { useForm } from "@tanstack/react-form";

import { maximumUtterance } from "#shared/interview/index.ts";

import type { MemberUtterance } from "#shared/interview/index.ts";
import type { ReactElement } from "react";

function InterviewComposer({
  disabled,
  onSay,
}: Readonly<{
  disabled: boolean;
  onSay: (utterance: MemberUtterance) => void;
}>): ReactElement {
  const form = useForm({
    defaultValues: { draft: "" },
    onSubmit: ({ formApi, value }) => {
      const text = value.draft.trim();
      if (disabled || text === "") {
        return;
      }
      onSay({ kind: "text", text });
      formApi.reset();
    },
  });
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="draft">
        {(field) => (
          <>
            <Field
              autoComplete="off"
              label="メッセージ"
              maxLength={maximumUtterance}
              name="utterance"
              onValueChange={field.handleChange}
              value={field.state.value}
            />
            <Button
              disabled={disabled || field.state.value.trim() === ""}
              type="submit"
              variant="primary"
            >
              送信
            </Button>
          </>
        )}
      </form.Field>
    </form>
  );
}

export { InterviewComposer };
