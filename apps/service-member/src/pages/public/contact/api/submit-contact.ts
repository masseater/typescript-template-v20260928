import { Acknowledged } from "@repo/runtime/contracts";
import { apiData } from "@repo/runtime/client";

import { userClient } from "#shared/api/index.ts";
import { ContactSubmission } from "#shared/contracts/index.ts";

type ContactFormValues = typeof ContactSubmission.Type;

function submitContact(values: ContactFormValues): Promise<typeof Acknowledged.Type> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.contact.post(values).then((response) => apiData(Acknowledged, response)),
  );
}

export { submitContact };
