import { MEMBER_MCP_SCOPE } from "@repo/config";
import {
  type ActionState,
  ActionStatus,
  Button,
  CheckboxField,
  ConfirmDialog,
  Field,
  FormColumn,
  Page,
  STATUS_VARIANT,
  StatusMessage,
  localState,
} from "@repo/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiKeysOptions, revokeApiKey, type ListedApiKey } from "#pages/settings/api/api-keys.ts";
import { useApiKeyForm } from "#pages/settings/model/api-key-form.ts";
import { scopeLabel } from "#shared/contracts/index.ts";

import type { ReactElement } from "react";
const useRevokeConfirming = localState(false);
function ApiKeyItem({
  action,
  entry,
  onRevoked,
}: Readonly<{
  action: ActionState;
  entry: ListedApiKey;
  onRevoked: () => void;
}>): ReactElement {
  const [confirming, setConfirming] = useRevokeConfirming();
  const label = entry.name ?? "名前のない API キー";
  const revoke = (): void => {
    setConfirming(false);
    action.run(() => revokeApiKey(entry.id).then(() => onRevoked()));
  };
  return (
    <li>
      <span>{label}</span>
      {entry.start === null ? null : <span>{`（${entry.start}…）`}</span>}
      <Button
        aria-label={`${label}を無効にする`}
        disabled={action.blocked}
        onClick={() => {
          setConfirming(true);
        }}
        type="button"
        variant="secondary"
      >
        無効にする
      </Button>
      <ConfirmDialog
        confirmLabel="無効にする"
        description="無効にしたキーは直ちに使えなくなります。"
        onConfirm={revoke}
        onOpenChange={setConfirming}
        open={confirming}
        title={`${label}を無効にしますか？`}
        variant="danger"
      />
    </li>
  );
}
function ApiKeyEntries({
  action,
  failure,
  keys,
  onRevoked,
}: Readonly<{
  action: ActionState;
  failure: string | undefined;
  keys: readonly ListedApiKey[] | undefined;
  onRevoked: () => void;
}>): ReactElement {
  if (failure !== undefined) {
    return <StatusMessage variant={STATUS_VARIANT.failure}>{failure}</StatusMessage>;
  }
  if (keys === undefined) {
    return <StatusMessage variant={STATUS_VARIANT.pending}>読み込み中です。</StatusMessage>;
  }
  if (keys.length === 0) {
    return <StatusMessage>API キーはまだありません。</StatusMessage>;
  }
  return (
    <ul>
      {keys.map((entry) => (
        <ApiKeyItem action={action} entry={entry} key={entry.id} onRevoked={onRevoked} />
      ))}
    </ul>
  );
}
function issuedNotice(issued: Readonly<{ key: string }> | undefined): string | undefined {
  return issued === undefined
    ? undefined
    : `発行した API キー（この画面を離れると再表示できません）: ${issued.key}`;
}
function AiPage(): ReactElement {
  const listed = useQuery(apiKeysOptions);
  const queries = useQueryClient();
  function reload(): void {
    void queries.invalidateQueries({ queryKey: apiKeysOptions.queryKey });
  }
  const form = useApiKeyForm(reload);
  return (
    <Page title="AI と API">
      <FormColumn>
        <Field
          label="キーの名前"
          name="api-key-name"
          onValueChange={form.handleNameChange}
          value={form.name}
        />
        <CheckboxField
          checked={form.profileUpdate}
          label={scopeLabel(MEMBER_MCP_SCOPE.profileUpdate)}
          onCheckedChange={form.handleProfileUpdateChange}
        />
        <CheckboxField
          checked={form.messageSend}
          label={scopeLabel(MEMBER_MCP_SCOPE.messageSend)}
          onCheckedChange={form.handleMessageSendChange}
        />
        <Button
          aria-label="APIキーを発行する"
          disabled={form.action.blocked || form.name.trim() === ""}
          onClick={form.handleIssue}
          type="button"
          variant="primary"
        >
          APIキーを発行
        </Button>
        <ActionStatus action={form.action} notice={issuedNotice(form.issued)} />
      </FormColumn>
      <ApiKeyEntries
        action={form.action}
        failure={listed.error?.message}
        keys={listed.data}
        onRevoked={reload}
      />
    </Page>
  );
}
export { AiPage };
