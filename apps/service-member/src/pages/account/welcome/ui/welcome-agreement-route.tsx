import { useSuspenseQuery } from "@tanstack/react-query";

import { agreementsOptions } from "#entities/agreement/index.ts";
import { AgreementPage } from "./agreement-page.tsx";

import type { ReactElement } from "react";

function WelcomeAgreementRoute(): ReactElement {
  const { data } = useSuspenseQuery(agreementsOptions);
  return <AgreementPage agreements={data} />;
}

export { WelcomeAgreementRoute };
