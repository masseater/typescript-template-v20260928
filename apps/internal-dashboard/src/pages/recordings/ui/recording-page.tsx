import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { recordingsKey } from "#pages/recordings/api/recordings.ts";
import { useRecordingActions } from "#pages/recordings/model/recording-actions.ts";
import { RecordingView } from "./recording-view.tsx";

import type { RecordingDetail } from "#pages/recordings/model/recording-state.ts";
import type { ReactElement } from "react";

function RecordingPage({ recording }: Readonly<{ recording: RecordingDetail }>): ReactElement {
  const queries = useQueryClient();
  const refresh = (): Promise<void> => queries.invalidateQueries({ queryKey: recordingsKey });
  const navigate = useNavigate();
  const actions = useRecordingActions(recording.recording.id, {
    onChanged: refresh,
    onDeleted: () => navigate({ to: "/recordings" }),
  });
  return <RecordingView actions={actions} onRefresh={refresh} recording={recording} />;
}

export { RecordingPage };
