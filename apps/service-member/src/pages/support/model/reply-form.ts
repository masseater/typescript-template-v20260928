import { replyToInquiry } from "#pages/support/api/support.ts";
import { useReplyBody } from "#shared/ui/index.ts";

import type { ReplyBodyFormState } from "#shared/ui/index.ts";

function useReplyForm(inquiryId: string, onReplied: () => void): ReplyBodyFormState {
  return useReplyBody((body) => replyToInquiry({ body, id: inquiryId }), onReplied);
}

export { useReplyForm };
