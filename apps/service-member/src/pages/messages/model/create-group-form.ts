import { GROUP_JOIN_POLICY } from "@repo/config";
import { useAction } from "@repo/ui";
import { useForm, useStore } from "@tanstack/react-form";

import { createGroup } from "#pages/messages/api/messages.ts";

import type { GroupJoinPolicy } from "#pages/messages/api/messages.ts";

interface CreateGroupForm {
  readonly blocked: boolean;
  readonly error: string | undefined;
  readonly handleNameChange: (value: string) => void;
  readonly name: string;
  readonly pending: boolean;
  readonly submit: (joinPolicy: GroupJoinPolicy) => void;
}

const invitedJoin: Readonly<{ joinPolicy: GroupJoinPolicy }> = {
  joinPolicy: GROUP_JOIN_POLICY.invite,
};

function useCreateGroupForm(onCreated: (groupId: string) => Promise<void>): CreateGroupForm {
  const action = useAction();
  const form = useForm({
    defaultValues: { name: "" },
    onSubmit: ({ meta, value }) => {
      action.run(() =>
        createGroup(value.name, meta.joinPolicy).then((created) =>
          onCreated(created.groupId).then(() => undefined),
        ),
      );
    },
    onSubmitMeta: invitedJoin,
  });
  const name = useStore(form.store, (state) => state.values.name);
  return {
    blocked: action.blocked,
    error: action.error,
    handleNameChange: (value) => {
      form.setFieldValue("name", value);
    },
    name,
    pending: action.pending,
    submit: (joinPolicy) => {
      void form.handleSubmit({ joinPolicy });
    },
  };
}

export { useCreateGroupForm };
