import { Acknowledged } from "@repo/runtime/contracts";
import { apiData } from "@repo/runtime/client";

import { userClient } from "#shared/api/index.ts";
import { LeaveRequest } from "#shared/contracts/index.ts";

function submitLeave(values: typeof LeaveRequest.Type): Promise<typeof Acknowledged.Type> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.leave.post(values).then((response) => apiData(Acknowledged, response)),
  );
}

export { submitLeave };
