import { errorMessage } from "@repo/auth-ui";
import { apiData } from "@repo/runtime/client";
import { formatWarekiDate } from "@repo/ui";
import { queryOptions } from "@tanstack/react-query";

import { adminClient } from "#shared/api/index.ts";
import { AdminList } from "#shared/contracts/index.ts";

type AdminSummary = (typeof AdminList.Type)[number];

interface ListedAdmin {
  readonly accountState: AdminSummary["accountState"];
  readonly email: string;
  readonly id: string;
  readonly name: string;
  readonly permission?: AdminSummary["permission"];
  readonly registeredOn: string;
}

function listAdmins(): Promise<readonly ListedAdmin[]> {
  return adminClient()
    .admins.get()
    .then((response) => {
      const admins = apiData(AdminList, response);
      return admins.map(({ createdAt, ...admin }) => ({
        ...admin,
        registeredOn: formatWarekiDate(createdAt),
      }));
    })
    .catch((failure: unknown) => {
      throw new Error(errorMessage(failure));
    });
}

const adminListOptions = queryOptions({
  queryFn: listAdmins,
  queryKey: ["admin-admins"],
  retry: false,
});

export { adminListOptions };
export type { ListedAdmin };
