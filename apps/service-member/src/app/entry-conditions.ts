import { loginPath, sessionOptions } from "@repo/auth-ui";
import { redirect } from "@tanstack/react-router";
import { Effect } from "effect";

import { blocksMember, loadAgreements } from "#entities/agreement/index.ts";
import { onboardingOptions } from "#pages/account/welcome/index.ts";
import { recoveryOfferOptions } from "#pages/recovery/index.ts";

import type { Agreements } from "#entities/agreement/index.ts";
import type { Session } from "#entities/session/index.ts";
import type { OnboardingStep, RecoveryOfferView } from "#shared/contracts/index.ts";
import type { QueryClient } from "@tanstack/react-query";

type RecoveryOffer = typeof RecoveryOfferView.Type;

const entrances: ReadonlySet<string> = new Set(["/", "/login", "/signup"]);

const agreementPath = "/agreement";

const welcomePath = {
  agreement: "/welcome/agreement",
  choose: "/welcome/choose",
  interview: "/welcome/interview",
  profile: "/welcome/profile",
} as const satisfies Readonly<Record<Exclude<OnboardingStep, "done">, string>>;

const recoveryPath = "/welcome/recovery";

const currentSession = (queries: QueryClient): Effect.Effect<Session | null> =>
  Effect.promise(() => queries.query(sessionOptions));

const currentOnboardingStep = (queries: QueryClient): Effect.Effect<OnboardingStep> =>
  Effect.promise(() => queries.query(onboardingOptions));

const currentRecoveryOffer = (queries: QueryClient): Effect.Effect<RecoveryOffer> =>
  Effect.promise(() => queries.query(recoveryOfferOptions));

function enterPublicFrame(queries: QueryClient, pathname: string): Promise<void> {
  return Effect.runPromise(
    Effect.gen(function* enterPublic() {
      if (!entrances.has(pathname)) {
        return;
      }
      const session = yield* currentSession(queries);
      if (session !== null) {
        throw redirect({ to: "/home" });
      }
    }),
  );
}

type PendingStep = Exclude<OnboardingStep, "done">;

const signedIn = (session: Session | null, href: string): Session => {
  if (session === null) {
    throw redirect({ href: loginPath(href) });
  }
  return session;
};

const pendingStep = (step: OnboardingStep): PendingStep => {
  if (step === "done") {
    throw redirect({ to: "/home" });
  }
  return step;
};

const requireOnboarded = (queries: QueryClient, step: OnboardingStep): Effect.Effect<void> =>
  Effect.gen(function* requireOnboarded() {
    if (step === "done") {
      return;
    }
    const offer = yield* currentRecoveryOffer(queries);
    throw redirect({ to: offer.available ? recoveryPath : welcomePath[step] });
  });

const leaveWelcome = (pathname: string): void => {
  if (pathname.startsWith("/welcome")) {
    throw redirect({ to: "/home" });
  }
};

const requireAgreed = (agreements: Agreements, href: string, pathname: string): void => {
  if (blocksMember(agreements.pending) && pathname !== agreementPath) {
    throw redirect({ search: { redirect: href }, to: agreementPath });
  }
};

const settleRecovery = (available: boolean, pathname: string, step: PendingStep): void => {
  if (available !== (pathname === recoveryPath)) {
    throw redirect({ to: available ? recoveryPath : welcomePath[step] });
  }
};

function enterMemberFrame(
  queries: QueryClient,
  href: string,
  pathname: string,
): Promise<{ agreements: Agreements; session: Session }> {
  return Effect.runPromise(
    Effect.gen(function* enterMember() {
      const session = signedIn(yield* currentSession(queries), href);
      const { agreements, step } = yield* Effect.all(
        {
          agreements: Effect.promise(() => loadAgreements()),
          step: currentOnboardingStep(queries),
        },
        { concurrency: "unbounded" },
      );
      yield* requireOnboarded(queries, step);
      leaveWelcome(pathname);
      requireAgreed(agreements, href, pathname);
      return { agreements, session };
    }),
  );
}

function enterWelcomeFrame(
  queries: QueryClient,
  href: string,
  pathname: string,
): Promise<{ session: Session; step: PendingStep }> {
  return Effect.runPromise(
    Effect.gen(function* enterWelcome() {
      const session = signedIn(yield* currentSession(queries), href);
      const fetched = yield* Effect.all(
        { offer: currentRecoveryOffer(queries), step: currentOnboardingStep(queries) },
        { concurrency: "unbounded" },
      );
      const step = pendingStep(fetched.step);
      settleRecovery(fetched.offer.available, pathname, step);
      return { session, step };
    }),
  );
}

export { enterMemberFrame, enterPublicFrame, enterWelcomeFrame, welcomePath };
