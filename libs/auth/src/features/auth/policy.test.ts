import { ROLE } from "@repo/config/identity";
import { describe, expect, test } from "vite-plus/test";

import { isPrivilegedRole } from "./policy.ts";

describe.for([
  [ROLE.member, false],
  [ROLE.administrator, true],
  [ROLE.staff, true],
] as const)("the %s role", ([role, privileged]) => {
  const it = test.extend("rolePrivileged", () => isPrivilegedRole(role));

  it(`is ${privileged ? "privileged" : "unprivileged"}`, ({ rolePrivileged }) => {
    expect(rolePrivileged).toBe(privileged);
  });
});
