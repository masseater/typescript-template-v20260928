import { Acknowledged, IdentifierQuery } from "@repo/runtime/contracts";
import { verifiedSessionId } from "@repo/auth";
import { httpStatus } from "@repo/config";
import { dismissReport, listReports, readReport, suspendTarget, warnTarget } from "@repo/db/admin";
import { privileged } from "@repo/runtime/account";
import { createApi, readJsonBody, readSearchParams } from "@repo/runtime/http";
import { Effect } from "effect";

import { ReportDetail, ReportList, ReportListQuery, reportPageSize } from "#shared/contracts/index.ts";

import type { AppServices } from "@repo/runtime";
import type { ApiRoutes } from "@repo/runtime/http";

const failures = {
  ...privileged,
  TrustSubjectNotFound: {
    message: "通報が見つかりません。",
    status: httpStatus.notFound,
  },
  TrustTargetUnavailable: {
    message: "対象が見つかりません。",
    status: httpStatus.notFound,
  },
};

const listPage = Effect.fn("reports.list")(function* listPage(request: Request) {
  const sessionId = yield* verifiedSessionId(request);
  const query = yield* readSearchParams(ReportListQuery, request);
  const list = yield* listReports(sessionId, {
    limit: reportPageSize,
    offset: (query.page - 1) * reportPageSize,
    ...(query.status === undefined ? {} : { status: query.status }),
  });
  return { ...list, pageSize: 20 as const };
});

const detail = Effect.fn("reports.detail")(function* detail(request: Request) {
  const sessionId = yield* verifiedSessionId(request);
  const { id } = yield* readSearchParams(IdentifierQuery, request);
  return yield* readReport(sessionId, id);
});

const suspend = Effect.fn("reports.suspend")(function* suspend(request: Request) {
  const sessionId = yield* verifiedSessionId(request);
  const { id } = yield* readJsonBody(IdentifierQuery, request);
  yield* suspendTarget({ reportId: id, sessionId, suspended: true });
  return { ok: true as const };
});

const unsuspend = Effect.fn("reports.unsuspend")(function* unsuspend(request: Request) {
  const sessionId = yield* verifiedSessionId(request);
  const { id } = yield* readJsonBody(IdentifierQuery, request);
  yield* suspendTarget({ reportId: id, sessionId, suspended: false });
  return { ok: true as const };
});

const warn = Effect.fn("reports.warn")(function* warn(request: Request) {
  const sessionId = yield* verifiedSessionId(request);
  const { id } = yield* readJsonBody(IdentifierQuery, request);
  yield* warnTarget(sessionId, id);
  return { ok: true as const };
});

const dismiss = Effect.fn("reports.dismiss")(function* dismiss(request: Request) {
  const sessionId = yield* verifiedSessionId(request);
  const { id } = yield* readJsonBody(IdentifierQuery, request);
  yield* dismissReport(sessionId, id);
  return { ok: true as const };
});

function reportApi(api: ApiRoutes<AppServices>) {
  return createApi("/reports")
    .get("/", ...api.route({ response: ReportList }, listPage, failures))
    .get("/detail", ...api.route({ response: ReportDetail }, detail, failures))
    .post("/suspend", ...api.route({ response: Acknowledged }, suspend, failures))
    .post("/unsuspend", ...api.route({ response: Acknowledged }, unsuspend, failures))
    .post("/warn", ...api.route({ response: Acknowledged }, warn, failures))
    .post("/dismiss", ...api.route({ response: Acknowledged }, dismiss, failures));
}

export { reportApi };
