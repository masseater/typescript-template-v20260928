import { Heading, STATUS_VARIANT, StatusMessage } from "@repo/ui";
import { useQuery } from "@tanstack/react-query";

import { pendingCountOptions } from "#shared/api/index.ts";

import type { ReactElement } from "react";

function PendingInquiries(): ReactElement {
  const pending = useQuery(pendingCountOptions);
  if (pending.isError) {
    return <StatusMessage variant={STATUS_VARIANT.failure}>{pending.error.message}</StatusMessage>;
  }
  if (pending.data === undefined) {
    return <StatusMessage variant={STATUS_VARIANT.pending}>読み込み中です。</StatusMessage>;
  }
  return (
    <Heading as="h2" size="section">
      {pending.data}
    </Heading>
  );
}

function MembersQueueSummary(): ReactElement {
  return (
    <section aria-label="対応待ち" className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-lg border border-border bg-card p-3">
        <p className="text-sm leading-tight text-muted-foreground">対応待ちの問い合わせ</p>
        <PendingInquiries />
      </article>
    </section>
  );
}

export { MembersQueueSummary };
