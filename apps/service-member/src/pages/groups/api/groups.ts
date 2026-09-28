import { absent, apiData, apiDataOrNoneFor } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";

import { userClient } from "#shared/api/index.ts";
import { GroupInviteRefreshed, GroupJoined, GroupView } from "#shared/contracts/index.ts";

type GroupDetail = typeof GroupView.Type;

function loadGroup(id: string, invite?: string): Promise<GroupDetail> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.groups.view
      .get({ query: invite === undefined ? { id } : { id, invite } })
      .then((response) => {
        const group = apiDataOrNoneFor(absent.notFound)(GroupView, response);
        if (group === undefined) {
          throw notFound();
        }
        return group;
      }),
  );
}

function joinGroup(id: string, invite?: string): Promise<string> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.groups.join
      .post(invite === undefined ? { id } : { id, invite })
      .then((response) => apiData(GroupJoined, response).conversationId),
  );
}

function leaveGroup(id: string): Promise<void> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.groups.leave.post({ id }).then(() => undefined),
  );
}

function renameGroup(id: string, name: string): Promise<void> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.groups.rename.post({ id, name }).then(() => undefined),
  );
}

function refreshInvite(id: string): Promise<string> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.groups.invite
      .post({ id })
      .then((response) => apiData(GroupInviteRefreshed, response).inviteToken),
  );
}

const groupsKey = ["groups"] as const;

function groupOptions(id: string, invite?: string) {
  return queryOptions({
    queryFn: () => loadGroup(id, invite),
    queryKey: [...groupsKey, id, invite ?? null] as const,
    retry: false,
  });
}

export { groupOptions, groupsKey, joinGroup, leaveGroup, refreshInvite, renameGroup };
export type { GroupDetail };
