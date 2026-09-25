import { useSuspenseQuery } from "@tanstack/react-query";

import { notificationsOptions } from "#pages/notifications/api/notifications.ts";
import { NotificationsPage } from "./notifications-page.tsx";

import type { ReactElement } from "react";

function NotificationsRoute(): ReactElement {
  const { data: items } = useSuspenseQuery(notificationsOptions);
  return <NotificationsPage items={items} />;
}

export { NotificationsRoute };
