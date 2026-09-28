import { mcpApi } from "@repo/runtime/account";
import { apiRoutes } from "@repo/runtime/http";

import { serveMcp } from "#shared/mcp/index.ts";
import { memberApi } from "./member-api.ts";
import { reporting, runtime } from "./runtime.ts";

const api = apiRoutes(runtime, reporting);

const userApi = memberApi(api);

const memberProtocol = mcpApi(api, serveMcp);

export { memberProtocol, userApi, userApi as app };
export default userApi;
