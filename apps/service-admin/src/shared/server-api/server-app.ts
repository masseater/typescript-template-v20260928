import { verifySession } from "@repo/auth";
import { APPLICATION, apiRoot } from "@repo/config";
import { accountApi, mcpApi, sessionFailures } from "@repo/runtime/account";
import { apiDocs, apiRoutes, createApi } from "@repo/runtime/http";

import { serveMcp } from "#shared/admin/index.ts";
import { adminRoutes } from "./admin-api.ts";
import { agreementApi } from "./agreement-api.ts";
import { inquiryApi } from "./inquiry-api.ts";
import { reportApi } from "./report-api.ts";
import { reporting, runtime } from "./runtime.ts";

const api = apiRoutes(runtime, reporting);

const adminApi = createApi(apiRoot)
  .use(
    apiDocs(
      APPLICATION.admin,
      api.guard((request) => verifySession(request.headers), sessionFailures),
    ),
  )
  .use(accountApi(api))
  .use(agreementApi(api))
  .use(inquiryApi(api))
  .use(reportApi(api))
  .use(adminRoutes(api));

const adminProtocol = mcpApi(api, serveMcp);

export { adminApi, adminProtocol, adminApi as app };
export default adminApi;
