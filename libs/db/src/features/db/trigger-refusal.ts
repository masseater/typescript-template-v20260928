import { Schema } from "effect";

const triggerRefusals = [
  "LAST_ADMIN_REQUIRED",
  "LAST_EDITOR_REQUIRED",
  "INVITE_CONSUMED",
  "SESSION_VERSION_STALE",
] as const;
const TriggerRefusal = Schema.Literals(triggerRefusals);
type TriggerRefusal = typeof TriggerRefusal.Type;
const TRIGGER_REFUSAL = {
  inviteConsumed: triggerRefusals[2],
  lastAdminRequired: triggerRefusals[0],
  lastEditorRequired: triggerRefusals[1],
  sessionVersionStale: triggerRefusals[3],
} as const satisfies Record<string, TriggerRefusal>;

const upperSnakeWord = /\b[A-Z][A-Z0-9_]*\b/gu;
const isTriggerRefusal = Schema.is(TriggerRefusal);

const triggerRefusalOf = (cause: unknown): TriggerRefusal | undefined => {
  if (!(cause instanceof Error)) {
    return undefined;
  }
  return (
    (cause.message.match(upperSnakeWord) ?? []).find(isTriggerRefusal) ??
    triggerRefusalOf(cause.cause)
  );
};

export { TRIGGER_REFUSAL, TriggerRefusal, triggerRefusalOf, triggerRefusals };
