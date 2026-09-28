import { Effect } from "effect";

import { appearanceTimeout, pageStep } from "./screens.ts";

import type { Page, Request } from "playwright";
import type { JourneyFailure } from "./journey-failure.ts";

const visitSignedOut = (
  page: Page,
  visit: Readonly<{ childApi: string; origin: string; path: string }>,
): Effect.Effect<Readonly<{ landedOn: string; requestedTheChildApi: boolean }>, JourneyFailure> =>
  Effect.gen(function* openGatedChild() {
    const requestedPaths = new Set<string>();
    const onRequest = (sentRequest: Request): void => {
      requestedPaths.add(new URL(sentRequest.url()).pathname);
    };
    page.on("request", onRequest);
    yield* pageStep(() => page.goto(`${visit.origin}${visit.path}`)).pipe(
      Effect.andThen(
        pageStep(() =>
          page.waitForURL((url) => url.pathname === "/login", { timeout: appearanceTimeout }),
        ),
      ),
      Effect.ensuring(
        Effect.sync(() => {
          page.off("request", onRequest);
        }),
      ),
    );
    return {
      landedOn: new URL(page.url()).pathname,
      requestedTheChildApi: requestedPaths.has(visit.childApi),
    };
  });

export { visitSignedOut };
