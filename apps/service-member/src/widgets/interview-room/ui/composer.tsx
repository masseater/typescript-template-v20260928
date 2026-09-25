import { Button, Field, localState } from "@repo/ui";

import { maximumUtterance } from "#shared/interview/index.ts";

import type { MemberUtterance } from "#shared/interview/index.ts";
import type { ReactElement } from "react";

const useDraft = localState("");

function InterviewComposer({
  disabled,
  leads,
  onSay,
}: Readonly<{
  disabled: boolean;
  leads: boolean;
  onSay: (utterance: MemberUtterance) => void;
}>): ReactElement {
  const [draft, setDraft] = useDraft();
  const handleSubmit = (event: Readonly<{ preventDefault: () => void }>): void => {
    event.preventDefault();
    const text = draft.trim();
    if (disabled || text === "") {
      return;
    }
    onSay({ kind: "text", text });
    setDraft("");
  };
  return (
    <form className="flex items-end gap-2" onSubmit={handleSubmit}>
      <Field
        autoComplete="off"
        label="メッセージ"
        maxLength={maximumUtterance}
        name="utterance"
        onValueChange={setDraft}
        value={draft}
      />
      <Button
        disabled={disabled || draft.trim() === ""}
        type="submit"
        variant={leads ? "primary" : "secondary"}
      >
        送信
      </Button>
    </form>
  );
}

export { InterviewComposer };
