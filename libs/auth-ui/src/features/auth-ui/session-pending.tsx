import { STATUS_VARIANT } from "@repo/ui";

import { SessionStatus } from "./session-status.tsx";

import type { ReactElement } from "react";

const SessionPending = (): ReactElement => (
  <SessionStatus variant={STATUS_VARIANT.pending}>{"読み込み中です。"}</SessionStatus>
);

export { SessionPending };
