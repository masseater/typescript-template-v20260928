import { SessionUserProvider } from "@repo/auth-ui";
import { Outlet, getRouteApi } from "@tanstack/react-router";

import { AdminFrame } from "./admin-frame.tsx";

import type { ReactElement } from "react";

const route = getRouteApi("/_admin");

function AdminLayout(): ReactElement {
  const { session } = route.useRouteContext();
  return (
    <SessionUserProvider user={session.user}>
      <AdminFrame email={session.user.email} name={session.user.name}>
        <Outlet />
      </AdminFrame>
    </SessionUserProvider>
  );
}

export { AdminLayout };
