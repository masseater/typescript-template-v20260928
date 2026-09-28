import { apiData } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";

import { userClient } from "#shared/api/index.ts";
import { NotificationPreferences } from "#shared/contracts/index.ts";

type Preferences = typeof NotificationPreferences.Type;

function loadNotificationPreferences(): Promise<Preferences> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.notifications.preferences
      .get()
      .then((response) => apiData(NotificationPreferences, response)),
  );
}

function saveNotificationPreferences(preferences: Preferences): Promise<Preferences> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.notifications.preferences
      .patch(preferences)
      .then((response) => apiData(NotificationPreferences, response)),
  );
}

const notificationPreferencesOptions = queryOptions({
  queryFn: loadNotificationPreferences,
  queryKey: ["notification-preferences"],
  retry: false,
});

export { notificationPreferencesOptions, saveNotificationPreferences };
export type { Preferences };
