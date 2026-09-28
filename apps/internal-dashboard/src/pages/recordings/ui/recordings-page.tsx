import { Page, useToast } from "@repo/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { recordingsKey } from "#pages/recordings/api/recordings.ts";
import { PeopleSection } from "./people-section.tsx";
import { RecordingTable } from "./recording-table.tsx";
import { UploadSection } from "./upload-section.tsx";

import type { RecordingsOverview } from "#pages/recordings/model/recording-state.ts";
import type { ReactElement } from "react";

function RecordingsPage({ overview }: Readonly<{ overview: RecordingsOverview }>): ReactElement {
  const queries = useQueryClient();
  const navigate = useNavigate();
  const notify = useToast();
  const reload = (): Promise<void> => queries.invalidateQueries({ queryKey: recordingsKey });
  const openUploaded = (recordingId: string): Promise<void> => {
    notify("success", "アップロードしました。文字起こしを始めます。");
    return navigate({ params: { id: recordingId }, to: "/recordings/$id" });
  };
  return (
    <Page title="録音">
      <UploadSection onUploaded={openUploaded} />
      <RecordingTable recordings={overview.recordings} />
      <PeopleSection people={overview.people} onChanged={reload} />
    </Page>
  );
}

export { RecordingsPage };
