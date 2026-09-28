import { SessionView } from "@repo/auth-ui";
import { absent, apiDataOrNoneFor } from "@repo/runtime/client";

import { userClient } from "#shared/api/index.ts";


function loadSession(): Promise<SessionView | undefined> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.session.get().then((response) => apiDataOrNoneFor(absent.unauthorized)(SessionView, response)),
  );
}

export { loadSession };
