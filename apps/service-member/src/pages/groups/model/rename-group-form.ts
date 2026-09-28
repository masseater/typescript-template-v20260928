import { useAction } from "@repo/ui";
import { useForm, useStore } from "@tanstack/react-form";
import { Schema } from "effect";

import { renameGroup } from "#pages/groups/api/groups.ts";
import { GroupRename } from "#shared/contracts/index.ts";

interface RenameGroupForm {
  readonly blocked: boolean;
  readonly error: string | undefined;
  readonly handleNameChange: (value: string) => void;
  readonly handleSubmit: (event: Readonly<{ preventDefault: () => void }>) => void;
  readonly name: string;
  readonly pending: boolean;
}

function useRenameGroupForm(
  groupId: string,
  initialName: string,
  onRenamed: () => Promise<void>,
): RenameGroupForm {
  const action = useAction();
  const form = useForm({
    defaultValues: { name: initialName },
    onSubmit: ({ value }) => {
      action.run(() => renameGroup(groupId, value.name).then(() => onRenamed()));
    },
    validators: {
      onSubmit: ({ value }) => {
        const decoded = Schema.decodeResult(GroupRename)({ id: groupId, name: value.name });
        return decoded._tag === "Failure" ? decoded.failure.message : undefined;
      },
    },
  });
  const name = useStore(form.store, (state) => state.values.name);
  const invalid = useStore(form.store, (state) => state.errorMap.onSubmit);
  return {
    blocked: action.blocked,
    error: action.error ?? invalid,
    handleNameChange: (value) => {
      form.setFieldValue("name", value);
    },
    handleSubmit: (event) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    name,
    pending: action.pending,
  };
}

export { useRenameGroupForm };
