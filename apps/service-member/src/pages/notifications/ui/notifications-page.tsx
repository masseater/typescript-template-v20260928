import { useAction } from "@repo/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationsOptions,
} from "#pages/notifications/api/notifications.ts";
import { navBadgesOptions } from "#widgets/member-frame/index.ts";
import { NotificationsView } from "./notifications-view.tsx";

import type { NotificationEntry } from "#shared/contracts/index.ts";
import type { ReactElement } from "react";

function NotificationsPage({
  items,
}: Readonly<{
  items: readonly NotificationEntry[];
}>): ReactElement {
  const navigate = useNavigate();
  const queries = useQueryClient();
  const readAllAction = useAction();
  const openAction = useAction();
  const refreshReadState = (): Promise<void> =>
    Promise.all([
      queries.invalidateQueries({ queryKey: notificationsOptions.queryKey }),
      queries.invalidateQueries({ queryKey: navBadgesOptions.queryKey }),
    ]).then(() => undefined);
  const readAll = (): void => {
    readAllAction.run(() => markAllNotificationsRead().then(refreshReadState));
  };
  const openItem = (item: NotificationEntry): void => {
    openAction.run(() => {
      const mark = item.read
        ? Promise.resolve()
        : markNotificationRead(item.id).then(refreshReadState);
      return mark.then(() => navigate({ href: item.href }).then(() => undefined));
    });
  };
  return (
    <NotificationsView
      error={readAllAction.error ?? openAction.error}
      items={items}
      onOpen={openItem}
      onReadAll={readAll}
      openBlocked={openAction.blocked}
      readAllBlocked={readAllAction.blocked}
    />
  );
}

export { NotificationsPage };
