import {
  Button,
  Field,
  FormColumn,
  Heading,
  Page,
  STATUS_VARIANT,
  StatusMessage,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatWarekiDateTime,
} from "@repo/ui";

import type { AuditFilterForm } from "#pages/audit/model/audit-filter.ts";
import type { StaffAuditPageView } from "#shared/contracts/index.ts";
import type { ReactElement } from "react";

function AuditView({
  audit,
  error,
  page,
}: Readonly<{
  audit: AuditFilterForm;
  error: string | undefined;
  page: StaffAuditPageView | undefined;
}>): ReactElement {
  const {
    action,
    actorId,
    handleActionChange,
    handleActorIdChange,
    handleSubmit,
    handleTargetIdChange,
    targetId,
  } = audit;
  return (
    <Page title="監査ログ">
      <form onSubmit={handleSubmit}>
        <FormColumn>
          <Field
            label="操作者 ID"
            name="actorId"
            onValueChange={handleActorIdChange}
            value={actorId}
          />
          <Field
            label="対象 ID"
            name="targetId"
            onValueChange={handleTargetIdChange}
            value={targetId}
          />
          <Field label="操作" name="action" onValueChange={handleActionChange} value={action} />
          <Button type="submit">絞り込む</Button>
        </FormColumn>
      </form>
      {error !== undefined && <p className="text-sm text-destructive">{error}</p>}
      {page === undefined && error === undefined && (
        <StatusMessage variant={STATUS_VARIANT.pending}>読み込み中です。</StatusMessage>
      )}
      {page !== undefined && page.events.length === 0 && (
        <StatusMessage variant={STATUS_VARIANT.empty}>監査ログはまだありません。</StatusMessage>
      )}
      {page !== undefined && page.events.length > 0 && (
        <section aria-label="監査ログ一覧">
          <Heading as="h2" size="section">
            一覧
          </Heading>
          <p className="text-sm text-muted-foreground">全 {page.total} 件</p>
          <Table label="監査ログ一覧">
            <TableHeader>
              <TableRow>
                <TableHead>日時</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>操作者 ID</TableHead>
                <TableHead>対象 ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{formatWarekiDateTime(event.createdAt.getTime())}</TableCell>
                  <TableCell>{event.action}</TableCell>
                  <TableCell>{event.actorId}</TableCell>
                  <TableCell>{event.targetId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </Page>
  );
}

export { AuditView };
