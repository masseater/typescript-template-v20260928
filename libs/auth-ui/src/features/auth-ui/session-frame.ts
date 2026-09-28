import { redirect } from "@tanstack/react-router";
import { Effect } from "effect";

import { sessionOptions } from "./api/session.ts";
import { sessionAdmission, type SessionVisit } from "./session-redirect.ts";

import type { QueryClient } from "@tanstack/react-query";
import type { SessionView } from "./protocol.ts";

const enterSessionFrame = (
  queries: QueryClient,
  visit: SessionVisit & Readonly<{ reloadDocument: boolean }>,
): Promise<Readonly<{ session: SessionView }>> =>
  Effect.runPromise(
    Effect.gen(function* admitSession() {
      const session = yield* Effect.promise(() => queries.query(sessionOptions));
      const admission = sessionAdmission(session, visit);
      if ("destination" in admission) {
        throw redirect({
          href: admission.destination,
          reloadDocument: visit.reloadDocument,
          replace: true,
        });
      }
      return { session: admission.admitted };
    }),
  );

export { enterSessionFrame };
export { SessionPending } from "./session-pending.tsx";
