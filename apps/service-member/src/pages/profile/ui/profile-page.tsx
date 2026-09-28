import { useAction } from "@repo/ui";
import { useQueryClient } from "@tanstack/react-query";

import { memberOptions } from "#entities/member/index.ts";
import { followMember, unfollowMember } from "#pages/profile/api/follow.ts";
import { blockMember, unblockMember } from "#shared/api/index.ts";
import { ProfileLayoutRenderer } from "#shared/profile-layout/index.ts";
import { ProfileActions } from "./profile-actions.tsx";
import { ProfileBody } from "./profile-body.tsx";

import type { Member } from "#pages/profile/model/member.ts";
import type { ReactElement } from "react";

function ProfilePage({ member, own }: Readonly<{ member: Member; own: boolean }>): ReactElement {
  const queries = useQueryClient();
  const followAction = useAction();
  const blockAction = useAction();
  const following = member.following ?? false;
  const blocked = member.blocked ?? false;
  const refreshMember = (): Promise<void> =>
    queries.invalidateQueries({ queryKey: memberOptions(member.id).queryKey });

  const toggleFollow = (): void => {
    followAction.run(() =>
      (following ? unfollowMember(member.id) : followMember(member.id)).then(refreshMember),
    );
  };

  const toggleBlock = (): void => {
    blockAction.run(() =>
      (blocked ? unblockMember(member.id) : blockMember(member.id)).then(refreshMember),
    );
  };

  const actions = (
    <ProfileActions
      block={blockAction}
      blocked={blocked}
      follow={followAction}
      following={following}
      memberId={member.id}
      onToggleBlock={toggleBlock}
      onToggleFollow={toggleFollow}
      own={own}
    />
  );

  return (
    <ProfileBody>
      <ProfileLayoutRenderer
        actions={actions}
        layout={member.profileLayout}
        member={member}
        own={own}
        sheet={member.sheet}
      />
    </ProfileBody>
  );
}

export { ProfilePage };
