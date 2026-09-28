import { ForbiddenNotice, useSessionUser } from "@repo/auth-ui";
import { operationVerdict } from "@repo/config";
import { InvitationBoard, Page } from "@repo/ui";

import { useStaffList } from "#pages/staff/model/staff-list.ts";
import { InviteStaffForm } from "./invite-staff-form.tsx";
import { StaffTable } from "./staff-table.tsx";

import type { ReactElement } from "react";

function StaffBoard(): ReactElement {
  const { listing, reload } = useStaffList();
  return (
    <InvitationBoard form={<InviteStaffForm onInvited={reload} />}>
      <StaffTable listing={listing} onReload={reload} />
    </InvitationBoard>
  );
}

function StaffPage(): ReactElement {
  const { permission } = useSessionUser();
  return (
    <Page title="メンバー">
      {operationVerdict("manageStaff", permission).permitted ? <StaffBoard /> : <ForbiddenNotice />}
    </Page>
  );
}

export { StaffPage };
