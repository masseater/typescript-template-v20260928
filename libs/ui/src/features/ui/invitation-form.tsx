import { useForm, useStore } from "@tanstack/react-form";
import { Effect, Option } from "effect";

import { useAction } from "./action";
import { ActionStatus } from "./action-status";
import { useOptionalString } from "./local-state";
import { Button } from "./shared/ui/button";
import { Field } from "./shared/ui/field";
import { SelectField } from "./shared/ui/select-field";
import { formatWarekiDate } from "./wareki";

import type { ReactElement, SyntheticEvent } from "react";

type Invitation = Readonly<{
  email: string;
  expiresAt: Date;
}>;

const sendInvitation = <Permission extends string>({
  email,
  invite,
  onInvited,
  onNotice,
  permission,
}: Readonly<{
  email: string;
  invite: (address: string, permission: Permission) => Promise<Invitation>;
  onInvited: () => void;
  onNotice: (notice: string) => void;
  permission: Permission;
}>): Effect.Effect<void> =>
  Effect.gen(function* sendInvitationMail() {
    const invited = yield* Effect.promise(() => invite(email, permission));
    onNotice(
      `${invited.email} に招待メールを送りました。${formatWarekiDate(invited.expiresAt)} まで有効です。`,
    );
    onInvited();
  });

const InvitationForm = <Permission extends string>({
  defaultPermission,
  invite,
  isPermission,
  label,
  onInvited,
  permissionOptions,
}: Readonly<{
  defaultPermission: Permission;
  invite: (email: string, permission: Permission) => Promise<Invitation>;
  isPermission: (value: string) => value is Permission;
  label: string;
  onInvited: () => void;
  permissionOptions: readonly Readonly<{ label: string; value: Permission }>[];
}>): ReactElement => {
  const action = useAction();
  const [notice, setNotice] = useOptionalString();
  const form = useForm({
    defaultValues: { email: "", permission: defaultPermission },
    onSubmit: ({ formApi, value }) => {
      setNotice(Option.none());
      const onNotice = (sentNotice: string): void => {
        setNotice(Option.some(sentNotice));
      };
      action.run(() =>
        Effect.runPromise(
          sendInvitation({
            email: value.email,
            invite,
            onInvited: () => {
              formApi.setFieldValue("email", "");
              onInvited();
            },
            onNotice,
            permission: value.permission,
          }),
        ),
      );
    },
  });
  const values = useStore(form.store, (state) => state.values);
  const submit = (submitEvent: Readonly<Pick<SyntheticEvent, "preventDefault">>): void => {
    submitEvent.preventDefault();
    void form.handleSubmit();
  };
  return (
    <form
      aria-label={label}
      aria-busy={action.pending}
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-lg border border-border p-3"
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-72">
          <Field
            label="メールアドレス"
            name="email"
            type="email"
            autoComplete="off"
            value={values.email}
            onValueChange={(entered) => {
              form.setFieldValue("email", entered);
            }}
          />
        </div>
        <div className="w-48">
          <SelectField
            label="権限"
            name="permission"
            options={permissionOptions}
            value={values.permission}
            onValueChange={(selected) => {
              if (isPermission(selected)) {
                form.setFieldValue("permission", selected);
              }
            }}
          />
        </div>
        <Button type="submit" variant="primary" disabled={action.blocked}>
          {"招待メールを送る"}
        </Button>
      </div>
      <ActionStatus
        action={action}
        notice={Option.getOrUndefined(notice)}
        pendingMessage="招待メールを送っています。"
      />
    </form>
  );
};

export { InvitationForm };
export type { Invitation };
