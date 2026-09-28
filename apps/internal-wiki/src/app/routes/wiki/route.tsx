import { SessionPending, enterSessionFrame } from "@repo/auth-ui/session-frame";
import { createFileRoute } from "@tanstack/react-router";

import { WikiLayout } from "#widgets/wiki-frame/index.ts";

const Route = createFileRoute("/wiki")({
  beforeLoad: ({ context, location }) =>
    enterSessionFrame(context.queryClient, {
      href: location.href,
      pathname: location.pathname,
      reloadDocument: true,
      role: undefined,
      securityExempt: false,
    }),
  component: WikiLayout,
  pendingComponent: SessionPending,
  ssr: false,
});

export { Route };
