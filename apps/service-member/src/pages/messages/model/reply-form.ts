import { sendMessage } from "#pages/messages/api/messages.ts";
import { useReplyBody } from "#shared/ui/index.ts";

import type { ReplyBodyFormState } from "#shared/ui/index.ts";

function useReplyForm(conversationId: string, onSent: () => Promise<void>): ReplyBodyFormState {
  return useReplyBody((body) => sendMessage(conversationId, body), onSent);
}

export { useReplyForm };
