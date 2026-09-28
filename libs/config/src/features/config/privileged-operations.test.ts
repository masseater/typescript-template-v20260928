import { describe, expect, test } from "vite-plus/test";

import { grantingPermissions, operationVerdict } from "./privileged-operations.ts";

describe.for([
  ["owner", "manageMembers", { permitted: true }],
  ["operator", "manageMembers", { permitted: true }],
  ["viewer", "manageMembers", { permitted: false, required: "operator" }],
  ["operator", "manageAdmins", { permitted: false, required: "owner" }],
  ["viewer", "browseAdminConsole", { permitted: true }],
  ["editor", "browseAdminConsole", { permitted: false, required: "viewer" }],
  [null, "browseAdminConsole", { permitted: false, required: "viewer" }],
  [undefined, "browseAdminConsole", { permitted: false, required: "viewer" }],
  ["editor", "manageStaff", { permitted: true }],
  ["viewer", "publishWiki", { permitted: false, required: "editor" }],
  ["owner", "editFlags", { permitted: false, required: "editor" }],
] as const)("a holder of %s asking to %s", ([held, operation, verdict]) => {
  const it = test.extend("decided", () => operationVerdict(operation, held));

  it(`is ${verdict.permitted ? "permitted" : "refused"}`, ({ decided }) => {
    expect(decided).toStrictEqual(verdict);
  });
});

describe.for([
  ["browseAdminConsole", ["viewer", "operator", "owner"]],
  ["manageMembers", ["operator", "owner"]],
  ["manageAdmins", ["owner"]],
  ["manageStaff", ["editor"]],
] as const)("the permissions granting %s", ([operation, granting]) => {
  const it = test.extend("granted", () => grantingPermissions(operation));

  it("run from the required permission to the top of its ladder", ({ granted }) => {
    expect(granted).toStrictEqual(granting);
  });
});
