import { ADMIN_PERMISSION, ROLE, STAFF_PERMISSION, type Role } from "@repo/config/identity";
import { sql, type SQL } from "drizzle-orm";
import { Schema, Struct } from "effect";

import { UserRow } from "./identity-schema.ts";
import { user } from "./schema.ts";

import type { Email } from "@repo/config";

/** @canonical-values db.bootstrap-kind */
const bootstrapKinds = ["admin", "staff"] as const;
const BOOTSTRAP_KIND = { admin: bootstrapKinds[0], staff: bootstrapKinds[1] } as const;
const BootstrapKind = Schema.Literals(bootstrapKinds);
type BootstrapKind = typeof BootstrapKind.Type;

const bootstrapRoles = {
  [BOOTSTRAP_KIND.admin]: { permission: ADMIN_PERMISSION.owner, role: ROLE.administrator },
  [BOOTSTRAP_KIND.staff]: { permission: STAFF_PERMISSION.editor, role: ROLE.staff },
} as const satisfies Readonly<Record<BootstrapKind, { permission: string; role: Role }>>;

const BootstrappedAdmin = Schema.Struct({
  ...Struct.pick(UserRow.fields, ["email", "id"]),
  permission: Schema.Literals([ADMIN_PERMISSION.owner, STAFF_PERMISSION.editor]),
  role: Schema.Literals([ROLE.administrator, ROLE.staff]),
});

type RolePromotion = Readonly<{
  bootstrapKind: BootstrapKind;
  email: typeof Email.Type;
  updatedAt: number;
}>;

const roleStatement = (
  { bootstrapKind, email, updatedAt }: RolePromotion,
  vacancy: (role: Role) => SQL,
): SQL => {
  const { permission, role } = bootstrapRoles[bootstrapKind];
  return sql`UPDATE ${user}
    SET role = ${role}, permission = ${permission}, updated_at = ${updatedAt}
    WHERE ${user.email} = ${email.toLowerCase()}
      AND ${user.emailVerified} = ${1}${vacancy(role)}
    RETURNING id, email, role, permission`;
};

const bootstrapStatement = (promotion: RolePromotion): SQL =>
  roleStatement(
    promotion,
    (role) => sql`
      AND ${user.role} = ${ROLE.member}
      AND NOT EXISTS (SELECT 1 FROM ${user} WHERE role = ${role})`,
  );

const ensureRoleStatement = (promotion: RolePromotion): SQL =>
  roleStatement(promotion, () => sql``);

export {
  BOOTSTRAP_KIND,
  BootstrapKind,
  BootstrappedAdmin,
  bootstrapStatement,
  ensureRoleStatement,
};
