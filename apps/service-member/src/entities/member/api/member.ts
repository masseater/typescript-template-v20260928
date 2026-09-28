import { absent, apiDataOrNoneFor } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";

import { userClient } from "#shared/api/index.ts";
import { MemberView } from "#shared/contracts/index.ts";

type Member = typeof MemberView.Type;

function loadMember(id: string): Promise<Member> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.member.get({ query: { id } }).then((response) => {
      const member = apiDataOrNoneFor(absent.notFound)(MemberView, response);
      if (member == null) {
        throw notFound();
      }
      return member as Member;
    }),
  );
}

const membersKey = ["members"] as const;

function memberOptions(id: string) {
  return queryOptions({
    queryFn: () => loadMember(id),
    queryKey: [...membersKey, id] as const,
    retry: false,
  });
}

export { memberOptions };
