import {
  ADMIN_PERMISSION,
  STAFF_PERMISSION,
  adminPermissions,
  staffPermissions,
  type AccountPermission,
} from "./identity.ts";

const operationRequirements = {
  answerInquiries: { ladder: adminPermissions, required: ADMIN_PERMISSION.operator },
  browseAdminConsole: { ladder: adminPermissions, required: ADMIN_PERMISSION.viewer },
  draftAgreements: { ladder: adminPermissions, required: ADMIN_PERMISSION.viewer },
  editFlags: { ladder: staffPermissions, required: STAFF_PERMISSION.editor },
  manageAdmins: { ladder: adminPermissions, required: ADMIN_PERMISSION.owner },
  manageMembers: { ladder: adminPermissions, required: ADMIN_PERMISSION.operator },
  manageStaff: { ladder: staffPermissions, required: STAFF_PERMISSION.editor },
  moderateReports: { ladder: adminPermissions, required: ADMIN_PERMISSION.operator },
  publishAgreements: { ladder: adminPermissions, required: ADMIN_PERMISSION.operator },
  publishWiki: { ladder: staffPermissions, required: STAFF_PERMISSION.editor },
} as const;

type PrivilegedOperation = keyof typeof operationRequirements;

type OperationOn<Ladder> = {
  [Operation in PrivilegedOperation]: (typeof operationRequirements)[Operation]["ladder"] extends Ladder
    ? Operation
    : never;
}[PrivilegedOperation];

type AdminOperation = OperationOn<typeof adminPermissions>;
type StaffOperation = OperationOn<typeof staffPermissions>;

type OperationVerdict =
  | Readonly<{ permitted: true }>
  | Readonly<{ permitted: false; required: AccountPermission }>;

const grantingPermissions = (operation: PrivilegedOperation): readonly AccountPermission[] => {
  const requirement: Readonly<{ ladder: readonly AccountPermission[]; required: AccountPermission }> =
    operationRequirements[operation];
  return requirement.ladder.slice(requirement.ladder.indexOf(requirement.required));
};

const operationVerdict = (
  operation: PrivilegedOperation,
  held: string | null | undefined,
): OperationVerdict =>
  grantingPermissions(operation).some((permission) => permission === held)
    ? { permitted: true }
    : { permitted: false, required: operationRequirements[operation].required };

export { grantingPermissions, operationVerdict };
export type { AdminOperation, OperationVerdict, PrivilegedOperation, StaffOperation };
