import { localState, useAction, type ActionState } from "@repo/ui";
import { useForm, useStore } from "@tanstack/react-form";
import { Option } from "effect";

import { createApiKey, type CreatedApiKey } from "#pages/settings/api/api-keys.ts";

interface ApiKeyForm {
  readonly action: ActionState;
  readonly handleMessageSendChange: (checked: boolean) => void;
  readonly handleNameChange: (value: string) => void;
  readonly handleProfileUpdateChange: (checked: boolean) => void;
  readonly handleIssue: () => void;
  readonly issued: CreatedApiKey | undefined;
  readonly messageSend: boolean;
  readonly name: string;
  readonly profileUpdate: boolean;
}

const useIssued = localState(Option.none<CreatedApiKey>());

function useApiKeyForm(onIssued: () => void): ApiKeyForm {
  const [issued, setIssued] = useIssued();
  const action = useAction();
  const form = useForm({
    defaultValues: { messageSend: false, name: "", profileUpdate: false },
    onSubmit: ({ formApi, value }) => {
      const trimmed = value.name.trim();
      if (trimmed === "") {
        return;
      }
      action.run(() =>
        createApiKey(trimmed, value).then((created) => {
          setIssued(Option.some(created));
          formApi.setFieldValue("name", "");
          onIssued();
        }),
      );
    },
  });
  const values = useStore(form.store, (state) => state.values);
  return {
    action,
    handleIssue: () => {
      void form.handleSubmit();
    },
    handleMessageSendChange: (checked) => {
      form.setFieldValue("messageSend", checked);
    },
    handleNameChange: (value) => {
      form.setFieldValue("name", value);
    },
    handleProfileUpdateChange: (checked) => {
      form.setFieldValue("profileUpdate", checked);
    },
    issued: Option.getOrUndefined(issued),
    messageSend: values.messageSend,
    name: values.name,
    profileUpdate: values.profileUpdate,
  };
}

export { useApiKeyForm };
