import { inquiryStatusLabels, inquiryStatuses } from "@repo/config";
import { Heading, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui";

import type { StaffInquiryCountsView } from "#shared/contracts/index.ts";
import type { ReactElement } from "react";

function InquiryCounts({ counts }: Readonly<{ counts: StaffInquiryCountsView }>): ReactElement {
  return (
    <>
      <section aria-label="件数" className="grid gap-3 sm:grid-cols-3">
        {inquiryStatuses.map((status) => (
          <article key={status} className="rounded-lg border border-border bg-card p-3">
            <p className="text-sm leading-tight text-muted-foreground">
              {inquiryStatusLabels[status]}
            </p>
            <Heading as="h2" size="section">
              {counts.byStatus[status]}
            </Heading>
          </article>
        ))}
      </section>
      {counts.trend.length > 0 && (
        <section aria-label="推移">
          <Heading as="h2" size="section">
            直近 30 日の推移
          </Heading>
          <Table label="直近 30 日の推移">
            <TableHeader>
              <TableRow>
                <TableHead>日付</TableHead>
                {inquiryStatuses.map((status) => (
                  <TableHead key={status}>{inquiryStatusLabels[status]}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {counts.trend.map((row) => (
                <TableRow key={row.day}>
                  <TableCell>{row.day}</TableCell>
                  {inquiryStatuses.map((status) => (
                    <TableCell key={status}>{row[status]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </>
  );
}

export { InquiryCounts };
