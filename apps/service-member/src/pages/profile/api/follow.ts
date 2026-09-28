import { Acknowledged } from "@repo/runtime/contracts";
import { apiData } from "@repo/runtime/client";

import { userClient } from "#shared/api/index.ts";

function followMember(memberId: string): Promise<void> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.social.follow.put({ memberId }).then((response) => {
      apiData(Acknowledged, response);
    }),
  );
}

function unfollowMember(memberId: string): Promise<void> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.social.follow.delete({ memberId }).then((response) => {
      apiData(Acknowledged, response);
    }),
  );
}

export { followMember, unfollowMember };
