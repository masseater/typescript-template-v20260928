import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { agreementsOptions } from "#entities/agreement/index.ts";
import { ReconsentPage } from "./reconsent-page.tsx";

import type { ReactElement } from "react";

const home = "/home";
const route = getRouteApi("/_member/agreement");

function AgreementRoute(): ReactElement {
  const { data: agreements } = useSuspenseQuery(agreementsOptions);
  const { redirect: destination } = route.useSearch();
  return <ReconsentPage agreements={agreements} destination={destination ?? home} />;
}

export { AgreementRoute };
