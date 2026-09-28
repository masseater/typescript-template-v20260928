import { ForbiddenNotice, useSessionUser } from "@repo/auth-ui";
import { operationVerdict } from "@repo/config";
import { InvitationBoard, Page } from "@repo/ui";

import { useAdminList } from "#pages/admins/model/admin-list.ts";
import { AdminsTable } from "./admins-table.tsx";
import { InviteAdminForm } from "./invite-admin-form.tsx";

import type { ReactElement } from "react";

function AdminsBoard(): ReactElement {
  const { listing, reload } = useAdminList();
  return (
    <InvitationBoard form={<InviteAdminForm onInvited={reload} />}>
      <AdminsTable listing={listing} onReload={reload} />
    </InvitationBoard>
  );
}

function AdminsPage(): ReactElement {
  const { permission } = useSessionUser();
  return (
    <Page title="管理者">
      {operationVerdict("manageAdmins", permission).permitted ? <AdminsBoard /> : <ForbiddenNotice />}
    </Page>
  );
}

export { AdminsPage };
