import { auditActions } from "@repo/config";
import { adminPageSize } from "@repo/config/paging";
import {
  Button,
  Field,
  FormColumn,
  Heading,
  Page,
  PageNavigation,
  PaginationLink,
  STATUS_VARIANT,
  SelectField,
  StatusMessage,
  formatWarekiDateTime,
  searchAtPage,
} from "@repo/ui";
import { Option, Schema } from "effect";

import { AuditAction } from "#pages/audit/model/audit-filter.ts";
import { DataTable } from "#shared/ui/data-table.tsx";

import type { AuditFilterForm } from "#pages/audit/model/audit-filter.ts";
import type { AuditSearch } from "#pages/audit/model/audit-search.ts";
import type { StaffAuditPageView } from "#shared/contracts/index.ts";
import type { PageTarget } from "@repo/ui";
import type { ReactElement } from "react";

const anyAction = "";
const actionOptions = [
  { label: "すべて", value: anyAction },
  ...auditActions.map((action) => ({ label: action, value: action })),
];
const decodeAction = Schema.decodeUnknownOption(AuditAction);

function AuditPageLink({
  search,
  target,
}: Readonly<{ search: AuditSearch; target: PageTarget }>): ReactElement {
  return (
    <PaginationLink
      to="/audit"
      search={searchAtPage(search, target.page)}
      current={target.current}
      aria-label={target.label}
    >
      {target.text}
    </PaginationLink>
  );
}

function AuditView({
  audit,
  error,
  page,
  search,
}: Readonly<{
  audit: AuditFilterForm;
  error: string | undefined;
  page: StaffAuditPageView | undefined;
  search: AuditSearch;
}>): ReactElement {
  const current = search.page ?? 1;
  const first = (current - 1) * adminPageSize + 1;
  function pageLink(target: PageTarget): ReactElement {
    return <AuditPageLink search={search} target={target} />;
  }
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
          <SelectField
            label="操作"
            name="action"
            onValueChange={(selected) => {
              handleActionChange(Option.getOrUndefined(decodeAction(selected)));
            }}
            options={actionOptions}
            value={action ?? anyAction}
          />
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
          <p className="text-sm text-muted-foreground">
            {`${page.total} 件中 ${first}〜${first + page.events.length - 1} 件`}
          </p>
          <DataTable
            columns={["日時", "操作", "操作者 ID", "対象 ID"]}
            label="監査ログ一覧"
            rows={page.events.map((event) => (
              <tr key={event.id} className="border-b border-border">
                <td className="p-2">{formatWarekiDateTime(event.createdAt.getTime())}</td>
                <td className="p-2">{event.action}</td>
                <td className="p-2">{event.actorId}</td>
                <td className="p-2">{event.targetId}</td>
              </tr>
            ))}
          />
        </section>
      )}
      {page !== undefined && (
        <PageNavigation
          current={current}
          last={Math.ceil(page.total / adminPageSize)}
          renderLink={pageLink}
        />
      )}
    </Page>
  );
}

export { AuditView };
