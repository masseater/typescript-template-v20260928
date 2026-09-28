import { Identifier } from "@repo/config/paging";
import { Email, staffPermissions } from "@repo/config";
import { Schema } from "effect";

const StaffPermission = Schema.Literals(staffPermissions);

const StaffSummary = Schema.Struct({
  createdAt: Schema.DateFromString,
  email: Schema.String,
  id: Schema.String,
  name: Schema.String,
  permission: Schema.optional(StaffPermission),
});

const StaffList = Schema.Array(StaffSummary);

const StaffInvitation = Schema.Struct({ email: Email, permission: StaffPermission });


const StaffPermissionChange = Schema.Struct({ id: Identifier, permission: StaffPermission });

const StaffPermissionChanged = Schema.Struct({
  id: Schema.String,
  permission: Schema.optional(StaffPermission),
});



export {
  StaffInvitation,
  StaffList,
  StaffPermission,
  StaffPermissionChange,
  StaffPermissionChanged,
};
