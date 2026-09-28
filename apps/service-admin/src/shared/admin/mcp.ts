import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { mailInvite } from "@repo/auth";
import { APPLICATION, ACCOUNT_STATE } from "@repo/config";
import { AUDIT_CHANNEL } from "@repo/db";
import {
  deleteUser,
  getMember,
  inviteAdmin,
  listAdmins,
  listUsers,
  setAdminPermission,
  setAdminState,
  setMemberState,
} from "@repo/db/admin";
import { mcpEndpoint, toolRunner } from "@repo/runtime";
import { IdentifierQuery } from "@repo/runtime/contracts";
import { Effect, Schema } from "effect";

import {
  AdminInvitation,
  AdminPermissionChange,
  UserDeletion,
  UserListQuery,
} from "#shared/contracts/index.ts";
import { authorizeMcpRequest } from "./authorize-mcp.ts";

import type { RunApp } from "@repo/runtime";
import type { AdminMcpActor } from "./authorize-mcp.ts";

const mcpVersion = "1.0.0";
const MemberFilters = Schema.toStandardJSONSchemaV1(Schema.toStandardSchemaV1(UserListQuery));
const Target = Schema.toStandardJSONSchemaV1(Schema.toStandardSchemaV1(IdentifierQuery));
const MemberDeletion = Schema.toStandardJSONSchemaV1(Schema.toStandardSchemaV1(UserDeletion));
const Invitation = Schema.toStandardJSONSchemaV1(Schema.toStandardSchemaV1(AdminInvitation));
const PermissionChange = Schema.toStandardJSONSchemaV1(
  Schema.toStandardSchemaV1(AdminPermissionChange),
);

const failureCodes: ReadonlyMap<string, string> = new Map([
  ["InviteRejected", "invite_rejected"],
  ["LastAdminRequired", "last_admin_required"],
  ["PermissionRequired", "permission_required"],
  ["TargetUnavailable", "target_unavailable"],
]);

function createServer(actor: AdminMcpActor, runAdmin: RunApp): McpServer {
  const server = new McpServer({ name: APPLICATION.admin, version: mcpVersion });
  const { sessionId } = actor;
  const channel = AUDIT_CHANNEL.mcp;
  const run = toolRunner(runAdmin, failureCodes);

  server.registerTool(
    "search_members",
    {
      description: "Search and list service members visible to the signed-in administrator.",
      inputSchema: MemberFilters,
    },
    (page) => run(listUsers(sessionId, page)),
  );

  server.registerTool(
    "get_member",
    {
      description: "Load one member record when the administrator may view that member.",
      inputSchema: Target,
    },
    ({ id }) => run(getMember(sessionId, id)),
  );

  server.registerTool(
    "suspend_member",
    {
      description: "Suspend a member account. Requires operator permission or higher.",
      inputSchema: Target,
    },
    ({ id }) =>
      run(
        setMemberState({
          accountState: ACCOUNT_STATE.suspended,
          channel,
          memberId: id,
          sessionId,
        }),
      ),
  );

  server.registerTool(
    "unsuspend_member",
    {
      description: "Restore a suspended member account. Requires operator permission or higher.",
      inputSchema: Target,
    },
    ({ id }) =>
      run(
        setMemberState({
          accountState: ACCOUNT_STATE.active,
          channel,
          memberId: id,
          sessionId,
        }),
      ),
  );

  server.registerTool(
    "delete_member",
    {
      description: "Permanently delete a member account. Requires operator permission or higher.",
      inputSchema: MemberDeletion,
    },
    ({ id }) => run(deleteUser({ channel, sessionId, targetId: id })),
  );

  server.registerTool(
    "list_admins",
    {
      description: "List administrator accounts. Requires owner permission.",
    },
    () => run(listAdmins(sessionId)),
  );

  server.registerTool(
    "invite_admin",
    {
      description: "Invite a new administrator by email. Requires owner permission.",
      inputSchema: Invitation,
    },
    ({ email, permission }) =>
      run(
        inviteAdmin({ channel, email, permission, sessionId }).pipe(
          Effect.flatMap((issued) =>
            mailInvite(issued).pipe(
              Effect.as({ email: issued.email, expiresAt: issued.expiresAt }),
            ),
          ),
        ),
      ),
  );

  server.registerTool(
    "change_admin_permission",
    {
      description: "Change another administrator's permission tier. Requires owner permission.",
      inputSchema: PermissionChange,
    },
    ({ id, permission }) =>
      run(setAdminPermission({ adminId: id, channel, permission, sessionId })),
  );

  server.registerTool(
    "disable_admin",
    {
      description: "Disable another administrator account. Requires owner permission.",
      inputSchema: Target,
    },
    ({ id }) =>
      run(
        setAdminState({
          accountState: ACCOUNT_STATE.suspended,
          adminId: id,
          channel,
          sessionId,
        }),
      ),
  );

  server.registerTool(
    "enable_admin",
    {
      description: "Re-enable a disabled administrator account. Requires owner permission.",
      inputSchema: Target,
    },
    ({ id }) =>
      run(
        setAdminState({
          accountState: ACCOUNT_STATE.active,
          adminId: id,
          channel,
          sessionId,
        }),
      ),
  );

  return server;
}

const serveMcp = mcpEndpoint(authorizeMcpRequest, (actor, runAdmin) =>
  createMcpHandler(() => createServer(actor, runAdmin)),
);

export { serveMcp };
