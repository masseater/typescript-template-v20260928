import { useAction } from "@repo/ui";
import { useForm, useStore } from "@tanstack/react-form";

import { publishVersion, reviseDraft } from "#pages/terms/api/agreement-versions.ts";

import type { VersionDetail } from "#pages/terms/model/agreement-versions.ts";

interface DraftFields {
  readonly body: string;
  readonly summary: string;
}

interface DraftForm extends DraftFields {
  readonly blocked: boolean;
  readonly error: string | undefined;
  readonly handleBodyChange: (value: string) => void;
  readonly handleSummaryChange: (value: string) => void;
  readonly handlePublish: () => void;
  readonly handleSave: () => void;
}

type DraftOutcome = "publish" | "save";

const savingOnly: Readonly<{ outcome: DraftOutcome }> = { outcome: "save" };

function useDraftForm(
  initial: Readonly<VersionDetail>,
  outcomes: Readonly<{
    onPublished: (version: string) => Promise<void>;
    onSaved: () => void;
  }>,
): DraftForm {
  const action = useAction();
  const form = useForm({
    defaultValues: { body: initial.body, summary: initial.summary ?? "" } satisfies DraftFields,
    onSubmit: ({ meta, value }) => {
      const revise = (): Promise<unknown> => reviseDraft({ ...value, id: initial.id });
      action.run(() =>
        meta.outcome === "publish"
          ? revise()
              .then(() => publishVersion(initial.id))
              .then((published) => outcomes.onPublished(published.version))
          : revise().then(() => {
              outcomes.onSaved();
            }),
      );
    },
    onSubmitMeta: savingOnly,
  });
  const fields = useStore(form.store, (state) => state.values);
  return {
    ...fields,
    blocked: action.blocked || fields.body.trim() === "",
    error: action.error,
    handleBodyChange: (body): void => {
      form.setFieldValue("body", body);
    },
    handleSummaryChange: (summary): void => {
      form.setFieldValue("summary", summary);
    },
    handlePublish: (): void => {
      void form.handleSubmit({ outcome: "publish" });
    },
    handleSave: (): void => {
      void form.handleSubmit(savingOnly);
    },
  };
}

export { useDraftForm };
