import { notificationKinds } from "@repo/config";
import { Schema } from "effect";

const NotificationKind = Schema.Literals(notificationKinds);

const NotificationItem = Schema.Struct({
  createdAt: Schema.Finite,
  href: Schema.String,
  id: Schema.String,
  kind: NotificationKind,
  label: Schema.String,
  read: Schema.Boolean,
});

type NotificationEntry = typeof NotificationItem.Type;

const NotificationList = Schema.Struct({
  items: Schema.Array(NotificationItem),
});


const NavBadges = Schema.Struct({
  notifications: Schema.Finite,
});
type NavBadges = typeof NavBadges.Type;


const NotificationPreferences = Schema.Struct({
  boardMail: Schema.Boolean,
  messageMail: Schema.Boolean,
});

export { NavBadges, NotificationList, NotificationPreferences };
export type { NotificationEntry };
