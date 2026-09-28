import { Heading, STATUS_VARIANT, StatusMessage } from "@repo/ui";
import { useQuery } from "@tanstack/react-query";

import { memberSummaryOptions } from "#shared/api/index.ts";

import type { ReactElement } from "react";

function MemberContact({ memberId }: Readonly<{ memberId: string }>): ReactElement {
  const summary = useQuery(memberSummaryOptions(memberId));
  if (summary.isError) {
    return <StatusMessage variant={STATUS_VARIANT.failure}>{summary.error.message}</StatusMessage>;
  }
  if (summary.data === undefined) {
    return <StatusMessage variant={STATUS_VARIANT.pending}>読み込み中です。</StatusMessage>;
  }
  return (
    <div className="flex flex-col gap-1">
      <p className="text-base leading-normal font-bold">{summary.data.name}</p>
      <p className="text-sm leading-normal text-muted-foreground">{summary.data.email}</p>
    </div>
  );
}

function MemberDetailPage({ memberId }: Readonly<{ memberId: string }>): ReactElement {
  return (
    <main className="flex flex-col gap-4 p-4">
      <Heading as="h1" size="page">
        利用者の詳細
      </Heading>
      <p className="text-base leading-tight text-muted-foreground">利用者 ID: {memberId}</p>
      <MemberContact memberId={memberId} />
    </main>
  );
}

export { MemberDetailPage };
