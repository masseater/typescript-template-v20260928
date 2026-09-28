import { Acknowledged, ResourceId } from "@repo/runtime/contracts";
import { apiData } from "@repo/runtime/client";

import { userClient } from "./client.ts";

import type { ReportReason, ReportSubject } from "@repo/config";

function blockMember(memberId: string): Promise<void> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.trust.block.put({ memberId }).then((response) => {
      apiData(Acknowledged, response);
    }),
  );
}

function unblockMember(memberId: string): Promise<void> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.trust.block.delete({ memberId }).then((response) => {
      apiData(Acknowledged, response);
    }),
  );
}

function fileReport(
  subjectKind: ReportSubject,
  subjectId: string,
  reason: ReportReason,
): Promise<void> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.trust.report.post({ reason, subjectId, subjectKind }).then((response) => {
      apiData(ResourceId, response);
    }),
  );
}

export { blockMember, fileReport, unblockMember };
