import { Page, STATUS_VARIANT, StatusMessage } from "@repo/ui";

import type { ReactElement } from "react";

function RecoveryPending(): ReactElement {
  return (
    <Page title="データの復旧">
      <StatusMessage variant={STATUS_VARIANT.pending}>読み込み中です。</StatusMessage>
    </Page>
  );
}

function RecoveryFailed(): ReactElement {
  return (
    <Page title="データの復旧">
      <StatusMessage variant={STATUS_VARIANT.failure}>
        復旧できるデータを確認できませんでした。
      </StatusMessage>
    </Page>
  );
}

export { RecoveryFailed, RecoveryPending };
