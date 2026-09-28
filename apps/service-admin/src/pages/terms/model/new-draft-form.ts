import { AGREEMENT_KIND, agreementKinds, type AgreementKind } from "@repo/config";
import { useAction } from "@repo/ui";
import { useForm, useStore } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";

import { createDraft } from "#pages/terms/api/agreement-versions.ts";

interface NewDraftFields {
  readonly body: string;
  readonly kind: AgreementKind;
  readonly summary: string;
  readonly version: string;
}

interface NewDraftForm extends NewDraftFields {
  readonly blocked: boolean;
  readonly error: string | undefined;
  readonly handleBodyChange: (value: string) => void;
  readonly handleKindChange: (value: string) => void;
  readonly handleSave: () => void;
  readonly handleSummaryChange: (value: string) => void;
  readonly handleVersionChange: (value: string) => void;
}

const isKind = (value: string): value is AgreementKind =>
  agreementKinds.some((kind) => kind === value);

const blankDraft: NewDraftFields = {
  body: "",
  kind: AGREEMENT_KIND.terms,
  summary: "",
  version: "",
};

function useNewDraftForm(): NewDraftForm {
  const navigate = useNavigate();
  const action = useAction();
  const form = useForm({
    defaultValues: blankDraft,
    onSubmit: ({ value }) => {
      action.run(() =>
        createDraft(value).then((saved) =>
          navigate({ params: { version: saved.version }, to: "/terms/$version" }),
        ),
      );
    },
  });
  const fields = useStore(form.store, (state) => state.values);
  return {
    ...fields,
    blocked: action.blocked || fields.version.trim() === "" || fields.body.trim() === "",
    error: action.error,
    handleBodyChange: (body): void => {
      form.setFieldValue("body", body);
    },
    handleKindChange: (value): void => {
      if (isKind(value)) {
        form.setFieldValue("kind", value);
      }
    },
    handleSave: (): void => {
      void form.handleSubmit();
    },
    handleSummaryChange: (summary): void => {
      form.setFieldValue("summary", summary);
    },
    handleVersionChange: (version): void => {
      form.setFieldValue("version", version);
    },
  };
}

export { useNewDraftForm };
