import { replyToThread } from "#pages/board/api/board.ts";
import { useReplyBody } from "#shared/ui/index.ts";

import type { ReplyBodyFormState } from "#shared/ui/index.ts";

function useReplyForm(threadId: string, onPosted: () => Promise<void>): ReplyBodyFormState {
  return useReplyBody((body) => replyToThread(threadId, body), onPosted);
}

export { useReplyForm };
