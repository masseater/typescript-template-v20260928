import { SessionPending, enterSessionFrame } from "@repo/auth-ui/session-frame";
import { createFileRoute } from "@tanstack/react-router";

import { DashboardLayout } from "#widgets/dashboard-frame/index.ts";

const Route = createFileRoute("/_dashboard")({
  beforeLoad: ({ context, location }) =>
    enterSessionFrame(context.queryClient, {
      href: location.href,
      pathname: location.pathname,
      reloadDocument: false,
      role: undefined,
      securityExempt: true,
    }),
  component: DashboardLayout,
  pendingComponent: SessionPending,
  ssr: false,
});

export { Route };
