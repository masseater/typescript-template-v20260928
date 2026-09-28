import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { wikiEditorOptions } from "#pages/wiki-edit/api/load-wiki-editor.ts";
import { WikiEditPage } from "./wiki-edit-page.tsx";

import type { ReactElement } from "react";

const editRoute = getRouteApi("/_dashboard/wiki-edit/$");

function WikiEditRoute(): ReactElement {
  const { _splat: path = "" } = editRoute.useParams();
  const { data } = useSuspenseQuery(wikiEditorOptions(path));
  return (
    <WikiEditPage
      key={`${data.source.path}:${String(data.source.draft?.version ?? 0)}`}
      data={data}
    />
  );
}

export { WikiEditRoute };
