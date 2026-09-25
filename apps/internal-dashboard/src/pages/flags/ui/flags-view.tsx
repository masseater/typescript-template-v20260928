import { Page, STATUS_VARIANT, StatusMessage } from "@repo/ui";

import { FlagRow } from "./flag-row.tsx";

import type { FlagEntry } from "#shared/contracts/index.ts";
import type { ReactElement } from "react";

function FlagsView({
  failure,
  flags,
  onReload,
  onToggled,
}: Readonly<{
  failure: string | undefined;
  flags: readonly FlagEntry[] | undefined;
  onReload: () => void;
  onToggled: () => Promise<void>;
}>): ReactElement {
  return (
    <Page title="機能フラグ">
      {failure !== undefined ? (
        <StatusMessage variant={STATUS_VARIANT.failure}>
          {failure}
          <button
            aria-label="再読み込み"
            className="ml-2 underline"
            onClick={onReload}
            type="button"
          >
            再読み込み
          </button>
        </StatusMessage>
      ) : null}
      {flags === undefined && failure === undefined ? (
        <StatusMessage variant={STATUS_VARIANT.pending}>読み込み中です。</StatusMessage>
      ) : null}
      {flags?.length === 0 ? (
        <StatusMessage variant={STATUS_VARIANT.empty}>機能フラグはまだありません。</StatusMessage>
      ) : null}
      {flags === undefined ? null : (
        <div className="flex flex-col gap-3">
          {flags.map((entry) => (
            <FlagRow key={entry.key} entry={entry} onToggled={onToggled} />
          ))}
        </div>
      )}
    </Page>
  );
}

export { FlagsView };
