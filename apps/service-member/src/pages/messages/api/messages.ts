import { httpStatus } from "@repo/config";
import { absent, apiData, apiDataOrNoneFor } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";

import { userClient } from "#shared/api/index.ts";
import {
  ConversationList,
  ConversationLookupResult,
  ConversationOpened,
  ConversationView,
  GroupCreate,
  GroupCreated,
  MessageSent,
} from "#shared/contracts/index.ts";

type ConversationListView = typeof ConversationList.Type;
type ConversationThread = typeof ConversationView.Type;
type GroupJoinPolicy = (typeof GroupCreate.Type)["joinPolicy"];

function loadConversations(page: number): Promise<ConversationListView> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.messages.conversations
      .get({ query: { page: String(page) } })
      .then((response) => apiData(ConversationList, response)),
  );
}

function loadConversation(id: string, page: number): Promise<ConversationThread> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.messages.conversation.get({ query: { id, page: String(page) } }).then((response) => {
      const conversation = apiDataOrNoneFor(absent.notFound)(ConversationView, response);
      if (conversation === undefined) {
        throw notFound();
      }
      return conversation;
    }),
  );
}

function sendMessage(conversationId: string, body: string): Promise<string> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.messages.messages
      .post({ body, conversationId })
      .then((response) => apiData(MessageSent, response).id),
  );
}

function createGroup(
  name: string,
  joinPolicy: GroupJoinPolicy,
): Promise<{ conversationId: string; groupId: string; inviteToken: string }> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.groups.create.post({ joinPolicy, name }).then((response) => {
      const created = apiData(GroupCreated, response);
      return {
        conversationId: created.conversationId,
        groupId: created.groupId,
        inviteToken: created.inviteToken,
      };
    }),
  );
}

function lookupConversation(peerId: string): Promise<string | null> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.messages.lookup
      .get({ query: { peerId } })
      .then((response) => apiData(ConversationLookupResult, response).conversationId),
  );
}

type OpenedConversation =
  | { readonly conversationId: string; readonly paidRequired: false }
  | { readonly paidRequired: true };

function openConversation(recipientId: string, body: string): Promise<OpenedConversation> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.messages.conversations.post({ body, recipientId }).then((reply) => {
      if (reply.error?.status === httpStatus.paymentRequired) {
        return { paidRequired: true };
      }
      const opened = apiData(ConversationOpened, reply);
      return { conversationId: opened.conversationId, paidRequired: false };
    }),
  );
}

const messagesKey = ["messages"] as const;

function conversationsOptions(page: number) {
  return queryOptions({
    queryFn: () => loadConversations(page),
    queryKey: [...messagesKey, "list", page] as const,
    retry: false,
  });
}

function conversationOptions(id: string, page: number) {
  return queryOptions({
    queryFn: () => loadConversation(id, page),
    queryKey: [...messagesKey, "conversation", id, page] as const,
    retry: false,
  });
}

export {
  conversationOptions,
  conversationsOptions,
  createGroup,
  lookupConversation,
  messagesKey,
  openConversation,
  sendMessage,
};
export type { ConversationListView, ConversationThread, GroupJoinPolicy };
