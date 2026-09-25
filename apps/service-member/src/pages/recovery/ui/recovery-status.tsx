import { Page, STATUS_VARIANT, StatusMessage } from "@repo/ui";

import type { ErrorComponentProps } from "@tanstack/react-router";
import type { ReactElement } from "react";

function RecoveryPending(): ReactElement {
  return (
    <Page title="データの復旧">
      <StatusMessage variant={STATUS_VARIANT.pending}>読み込み中です。</StatusMessage>
    </Page>
  );
}

function RecoveryFailed({ error }: Readonly<Pick<ErrorComponentProps, "error">>): ReactElement {
  return (
    <Page title="データの復旧">
      <StatusMessage variant={STATUS_VARIANT.failure}>{error.message}</StatusMessage>
    </Page>
  );
}

export { RecoveryFailed, RecoveryPending };
