import {
  Button,
  CheckboxField,
  FormColumn,
  Page,
  STATUS_VARIANT,
  StatusMessage,
  useAction,
  useToast,
} from "@repo/ui";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";

import {
  notificationPreferencesOptions,
  saveNotificationPreferences,
} from "#pages/settings/api/notification-preferences.ts";

import type { Preferences } from "#pages/settings/api/notification-preferences.ts";
import type { ReactElement } from "react";

function NotificationsPage({
  initial,
}: Readonly<{
  initial: Preferences;
}>): ReactElement {
  const notify = useToast();
  const queries = useQueryClient();
  const saveAction = useAction();
  const form = useForm({
    defaultValues: { boardMail: initial.boardMail, messageMail: initial.messageMail },
    onSubmit: ({ value }) => {
      saveAction.run(() =>
        saveNotificationPreferences(value)
          .then(() =>
            queries.invalidateQueries({ queryKey: notificationPreferencesOptions.queryKey }),
          )
          .then(() => notify("success", "通知設定を保存しました。")),
      );
    },
  });
  const save = (): void => {
    void form.handleSubmit();
  };
  return (
    <Page title="通知">
      {saveAction.error !== undefined && (
        <StatusMessage variant={STATUS_VARIANT.failure}>{saveAction.error}</StatusMessage>
      )}
      <FormColumn>
        <form.Field name="messageMail">
          {(field) => (
            <CheckboxField
              checked={field.state.value}
              label="メッセージのメール通知"
              onCheckedChange={field.handleChange}
            />
          )}
        </form.Field>
        <form.Field name="boardMail">
          {(field) => (
            <CheckboxField
              checked={field.state.value}
              label="掲示板のメール通知"
              onCheckedChange={field.handleChange}
            />
          )}
        </form.Field>
        <Button disabled={saveAction.blocked} onClick={save} type="button" variant="primary">
          保存
        </Button>
      </FormColumn>
    </Page>
  );
}

export { NotificationsPage };
