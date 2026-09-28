import { apiData } from "@repo/runtime/client";
import { useAction } from "@repo/ui";
import { useQueryClient } from "@tanstack/react-query";

import { reportsKey, type ReportItem } from "#pages/reports/api/load-reports.ts";
import { adminClient } from "#shared/api/index.ts";
import { ReportActionResult } from "#shared/contracts/index.ts";
import { ReportView, type ReportDecision } from "./report-view.tsx";

import type { ReactElement } from "react";

function ReportPage({ report }: Readonly<{ report: ReportItem }>): ReactElement {
  const queryClient = useQueryClient();
  const action = useAction();
  function decide(decision: ReportDecision): void {
    action.run(() =>
      adminClient()
        .reports[decision].post({ id: report.id })
        .then((response) => {
          apiData(ReportActionResult, response);
        })
        .then(() => queryClient.invalidateQueries({ queryKey: reportsKey })),
    );
  }
  return (
    <ReportView blocked={action.blocked} error={action.error} onDecide={decide} report={report} />
  );
}

export { ReportPage };
