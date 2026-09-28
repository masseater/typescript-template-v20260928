const userInboxBinding = "USER_INBOX";

const userInboxClassName = "UserInbox";

const localUserInbox = {
  class_name: userInboxClassName,
  name: userInboxBinding,
} as const;

export { localUserInbox, userInboxBinding, userInboxClassName };
