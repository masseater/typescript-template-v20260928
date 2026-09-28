import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import {
  peopleOptions,
  recordingOptions,
  recordingsOptions,
} from "#pages/recordings/api/recordings.ts";
import { RecordingPage } from "./recording-page.tsx";
import { RecordingsPage } from "./recordings-page.tsx";

import type { ReactElement } from "react";

const detailRoute = getRouteApi("/_dashboard/recordings/$id");

function RecordingsRoute(): ReactElement {
  const { data: recordings } = useSuspenseQuery(recordingsOptions);
  const { data: people } = useSuspenseQuery(peopleOptions);
  return <RecordingsPage overview={{ people, recordings }} />;
}

function RecordingRoute(): ReactElement {
  const { id } = detailRoute.useParams();
  const { data: recording } = useSuspenseQuery(recordingOptions(id));
  const { data: people } = useSuspenseQuery(peopleOptions);
  return <RecordingPage recording={{ ...recording, people }} />;
}

export { RecordingRoute, RecordingsRoute };
