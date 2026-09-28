import { useSuspenseQuery } from "@tanstack/react-query";

import { agreementsOptions } from "#entities/agreement/index.ts";
import { AgreementsPage } from "./agreements-page.tsx";

import type { ReactElement } from "react";

function SettingsAgreementsRoute(): ReactElement {
  const { data } = useSuspenseQuery(agreementsOptions);
  return <AgreementsPage agreements={data} />;
}

export { SettingsAgreementsRoute };
