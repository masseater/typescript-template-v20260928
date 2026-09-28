import { ACCOUNT_API_PATH } from "@repo/config";
import { InvitePending, previewInvitation } from "@repo/auth-ui";
import { createFileRoute } from "@tanstack/react-router";

import { InviteRoute } from "#pages/invite/index.ts";

const Route = createFileRoute("/_public/invite/$token")({
  loader: ({ params }) => previewInvitation(ACCOUNT_API_PATH.invite, params.token),
  pendingComponent: InvitePending,
  component: InviteRoute,
});

export { Route };
