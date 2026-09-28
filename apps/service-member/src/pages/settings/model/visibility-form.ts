import { profileVisibilities } from "@repo/config";
import { useAction } from "@repo/ui";
import { useForm, useStore } from "@tanstack/react-form";
import { Schema } from "effect";

import { saveVisibility } from "#pages/settings/api/visibility.ts";

import type { Visibility } from "#pages/settings/api/visibility.ts";

interface VisibilityForm extends Visibility {
  readonly blocked: boolean;
  readonly error: string | undefined;
  readonly handleSearchableChange: (checked: boolean) => void;
  readonly handleSubmit: (event: Readonly<{ preventDefault: () => void }>) => void;
  readonly handleVisibilityChange: (value: string) => void;
  readonly pending: boolean;
}

const isVisibility = Schema.is(Schema.Literals(profileVisibilities));

function useVisibilityForm(initial: Visibility, onSaved: () => Promise<void>): VisibilityForm {
  const action = useAction();
  const form = useForm({
    defaultValues: { searchable: initial.searchable, visibility: initial.visibility },
    onSubmit: ({ value }) => {
      action.run(() => saveVisibility(value).then(() => onSaved()));
    },
  });
  const values = useStore(form.store, (state) => state.values);
  return {
    ...values,
    blocked: action.blocked,
    error: action.error,
    handleSearchableChange: (searchable) => {
      form.setFieldValue("searchable", searchable);
    },
    handleSubmit: (event) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    handleVisibilityChange: (value) => {
      if (isVisibility(value)) {
        form.setFieldValue("visibility", value);
      }
    },
    pending: action.pending,
  };
}

export { useVisibilityForm };
