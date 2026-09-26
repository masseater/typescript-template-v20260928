import { auditActions } from "@repo/config";
import { Schema } from "effect";

import type { SubmitEventHandler } from "react";

const AuditAction = Schema.Literals(auditActions);

type AuditAction = typeof AuditAction.Type;

interface AuditFilter {
  readonly action: AuditAction | undefined;
  readonly actorId: string;
  readonly targetId: string;
}

interface AuditFilterForm extends AuditFilter {
  readonly handleActionChange: (action: AuditAction | undefined) => void;
  readonly handleActorIdChange: (actorId: string) => void;
  readonly handleSubmit: SubmitEventHandler<HTMLFormElement>;
  readonly handleTargetIdChange: (targetId: string) => void;
}

export { AuditAction };
export type { AuditFilter, AuditFilterForm };
