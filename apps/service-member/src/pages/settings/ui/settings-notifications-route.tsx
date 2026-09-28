import { useSuspenseQuery } from "@tanstack/react-query";

import { notificationPreferencesOptions } from "#pages/settings/api/notification-preferences.ts";
import { NotificationsPage } from "./notifications-page.tsx";

import type { ReactElement } from "react";

function SettingsNotificationsRoute(): ReactElement {
  const { data: preferences } = useSuspenseQuery(notificationPreferencesOptions);
  return <NotificationsPage initial={preferences} />;
}

export { SettingsNotificationsRoute };
