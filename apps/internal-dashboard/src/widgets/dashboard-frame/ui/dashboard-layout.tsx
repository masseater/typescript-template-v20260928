import { SessionUserProvider } from "@repo/auth-ui";
import { Outlet, getRouteApi } from "@tanstack/react-router";

import { DashboardFrame } from "./dashboard-frame.tsx";

import type { ReactElement } from "react";

const route = getRouteApi("/_dashboard");

function DashboardLayout(): ReactElement {
  const { session } = route.useRouteContext();
  return (
    <SessionUserProvider user={session.user}>
      <DashboardFrame email={session.user.email} name={session.user.name}>
        <Outlet />
      </DashboardFrame>
    </SessionUserProvider>
  );
}

export { DashboardLayout };
