import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { ACCOUNT_STATE, APPLICATION, MEMBER_MCP_SCOPE, ROLE } from "@repo/config";
import { and, eq, query, requirePaid, schema } from "@repo/db";
import { mcpEndpoint, toolFailure, toolRunner } from "@repo/runtime";
import { Clock, Effect, Schema } from "effect";

import {
  ConversationOpen,
  MemberListQuery,
  MessageSend,
  ProfileUpdate,
} from "#shared/contracts/index.ts";
import { getProfile, listMemberPage, updateProfile } from "#shared/members/index.ts";
import { MessagingMemberRequired } from "#shared/server-api/messaging-member-required.ts";
import { openDirectConversation, sendDirectMessage } from "#shared/server-api/messaging.ts";
import { authorizeMcpRequest } from "./authorize-mcp.ts";

import type { RunApp, ToolFailure } from "@repo/runtime";
import type { MemberMcpActor } from "./authorize-mcp.ts";

const { session, user } = schema;
const mcpVersion = "1.0.0";

const MemberSearch = Schema.toStandardJSONSchemaV1(Schema.toStandardSchemaV1(MemberListQuery));
const ProfileInput = Schema.toStandardJSONSchemaV1(Schema.toStandardSchemaV1(ProfileUpdate));
const MessageInput = Schema.toStandardJSONSchemaV1(
  Schema.toStandardSchemaV1(Schema.Union([MessageSend, ConversationOpen])),
);

const failureCodes: ReadonlyMap<string, string> = new Map([
  ["MessagingConversationNotFound", "target_unavailable"],
  ["MessagingMemberRequired", "member_required"],
  ["PaidPlanRequired", "paid_plan_required"],
  ["UserNotFound", "target_unavailable"],
]);

const requireMemberSession = Effect.fn("requireMemberSession")(function* requireMemberSession(
  actor: MemberMcpActor,
) {
  const now = yield* Clock.currentTimeMillis;
  const [row] = yield* query((database) =>
    database
      .select({
        accountState: user.accountState,
        audience: session.audience,
        emailVerified: user.emailVerified,
        expiresAt: session.expiresAt,
        id: user.id,
        role: user.role,
        securityVersion: user.securityVersion,
        sessionSecurityVersion: session.securityVersion,
      })
      .from(session)
      .innerJoin(user, eq(user.id, session.userId))
      .where(and(eq(session.id, actor.sessionId), eq(user.id, actor.userId)))
      .limit(1),
  );
  if (
    row === undefined ||
    row.audience !== APPLICATION.user ||
    row.expiresAt.getTime() <= now ||
    row.sessionSecurityVersion !== row.securityVersion ||
    row.role !== ROLE.member ||
    row.accountState !== ACCOUNT_STATE.active ||
    !row.emailVerified
  ) {
    return yield* new MessagingMemberRequired();
  }
  return row.id;
});

const denied = (scope: string): ToolFailure => toolFailure(`permission_required:${scope}`);

function createServer(actor: MemberMcpActor, runMember: RunApp): McpServer {
  const server = new McpServer({ name: APPLICATION.user, version: mcpVersion });
  const run = toolRunner(runMember, failureCodes);
  const signedInMember = requireMemberSession(actor);

  server.registerTool(
    "get_profile",
    { description: "Read the signed-in member's own profile." },
    () => {
      if (!actor.scopes.has(MEMBER_MCP_SCOPE.profileRead)) {
        return denied(MEMBER_MCP_SCOPE.profileRead);
      }
      return run(
        Effect.gen(function* program() {
          const id = yield* signedInMember;
          const profile = yield* getProfile(id);
          if (profile === undefined) {
            return yield* new MessagingMemberRequired();
          }
          return profile;
        }),
      );
    },
  );

  server.registerTool(
    "update_profile",
    {
      description: "Update the signed-in member's name, profile text, and links.",
      inputSchema: ProfileInput,
    },
    (values) => {
      if (!actor.scopes.has(MEMBER_MCP_SCOPE.profileUpdate)) {
        return denied(MEMBER_MCP_SCOPE.profileUpdate);
      }
      return run(
        Effect.gen(function* program() {
          const id = yield* signedInMember;
          return yield* updateProfile(id, values);
        }),
      );
    },
  );

  server.registerTool(
    "search_members",
    {
      description: "List or search members who opted into search. Paid members only.",
      inputSchema: MemberSearch,
    },
    (search) => {
      if (!actor.scopes.has(MEMBER_MCP_SCOPE.search)) {
        return denied(MEMBER_MCP_SCOPE.search);
      }
      return run(
        Effect.gen(function* program() {
          const id = yield* signedInMember;
          yield* requirePaid(id);
          return yield* listMemberPage(id, search);
        }),
      );
    },
  );

  server.registerTool(
    "send_message",
    {
      description:
        "Send a direct message. Opening a new conversation requires a paid plan. Replying does not.",
      inputSchema: MessageInput,
    },
    (message) => {
      if (!actor.scopes.has(MEMBER_MCP_SCOPE.messageSend)) {
        return denied(MEMBER_MCP_SCOPE.messageSend);
      }
      if ("conversationId" in message) {
        return run(
          Effect.gen(function* program() {
            const id = yield* signedInMember;
            return yield* sendDirectMessage(id, message.conversationId, message.body);
          }),
        );
      }
      return run(
        Effect.gen(function* program() {
          const id = yield* signedInMember;
          const sent = yield* openDirectConversation(id, message.recipientId, message.body);
          return { conversationId: sent.conversationId, id: sent.messageId };
        }),
      );
    },
  );

  return server;
}

const serveMcp = mcpEndpoint(authorizeMcpRequest, (actor, run) =>
  createMcpHandler(() => createServer(actor, run)),
);

export { serveMcp };
