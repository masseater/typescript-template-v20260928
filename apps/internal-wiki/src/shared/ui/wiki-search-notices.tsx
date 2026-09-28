import { FailureStatus } from "@repo/ui";

import type { WikiSearch } from "#shared/api/index.ts";
import type { ReactElement } from "react";

const keywordOnlyNotice = "意味検索が使えないため、キーワード検索のみです。";
const searchFailedNotice = "検索できませんでした。時間をおいてもう一度お試しください。";

function WikiSearchNotices({
  failed,
  found,
}: Readonly<{ failed: boolean; found: WikiSearch | undefined }>): ReactElement {
  return (
    <>
      <FailureStatus error={failed ? searchFailedNotice : undefined} />
      {found?.mode === "keyword_only" ? <span>{keywordOnlyNotice}</span> : null}
    </>
  );
}

export { WikiSearchNotices };
