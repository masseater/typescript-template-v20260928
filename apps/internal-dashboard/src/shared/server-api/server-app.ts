import { APPLICATION, apiRoot } from "@repo/config";
import { mcpApi, sessionApi } from "@repo/runtime/account";
import { apiDocs, apiRoutes, createApi } from "@repo/runtime/http";

import { dashboardApi } from "./dashboard-api.ts";
import { flagsApi } from "./flags-api.ts";
import { inquiryApi } from "./inquiry-api.ts";
import { serveMcp } from "./mcp.ts";
import { recordingsApi } from "./recordings-api.ts";
import { reporting, runtime } from "./runtime.ts";
import { staffApi } from "./staff-api.ts";
import { wikiEditApi } from "./wiki-edit-api.ts";

const api = apiRoutes(runtime, reporting);

const wikiApi = createApi("")
  .use(
    createApi(apiRoot)
      .use(apiDocs(APPLICATION.wiki))
      .use(sessionApi(api))
      .use(staffApi(api))
      .use(flagsApi(api))
      .use(inquiryApi(api))
      .use(dashboardApi(api))
      .use(recordingsApi(api))
      .use(wikiEditApi(api)),
  )
  .use(mcpApi(api, serveMcp));

export { wikiApi, wikiApi as app };
export default wikiApi;
