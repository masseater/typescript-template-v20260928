import { describe, expect, test } from "vite-plus/test";

import { localUserInbox, userInboxBinding, userInboxClassName } from "./realtime.ts";

describe("the local user inbox", () => {
  const it = test.extend("userInbox", () => localUserInbox);

  it("binds the user inbox class", ({ userInbox }) => {
    expect(userInbox).toStrictEqual({ class_name: userInboxClassName, name: userInboxBinding });
  });
});
