import { SessionPending, enterSessionFrame } from "@repo/auth-ui/session-frame";
import { ROLE } from "@repo/config";
import { createFileRoute } from "@tanstack/react-router";

import { AdminLayout } from "#widgets/admin-frame/index.ts";

const Route = createFileRoute("/_admin")({
  beforeLoad: ({ context, location }) =>
    enterSessionFrame(context.queryClient, {
      href: location.href,
      pathname: location.pathname,
      reloadDocument: false,
      role: ROLE.administrator,
      securityExempt: true,
    }),
  component: AdminLayout,
  pendingComponent: SessionPending,
  ssr: false,
});

export { Route };
