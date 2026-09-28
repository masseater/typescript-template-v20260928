import { Identifier } from "@repo/config/paging";
import { Email, adminPermissions } from "@repo/config";
import { Schema } from "effect";

import { AccountState, AccountStateChange, AccountStateChanged } from "./users.ts";

const AdminPermission = Schema.Literals(adminPermissions);

const AdminSummary = Schema.Struct({
  accountState: AccountState,
  createdAt: Schema.DateFromString,
  email: Schema.String,
  id: Schema.String,
  name: Schema.String,
  permission: Schema.optional(AdminPermission),
});

const AdminList = Schema.Array(AdminSummary);

const AdminInvitation = Schema.Struct({ email: Email, permission: AdminPermission });


const AdminPermissionChange = Schema.Struct({ id: Identifier, permission: AdminPermission });

const AdminPermissionChanged = Schema.Struct({
  id: Schema.String,
  permission: Schema.optional(AdminPermission),
});



export {
  AdminInvitation,
  AdminList,
  AdminPermission,
  AdminPermissionChange,
  AdminPermissionChanged,
};
