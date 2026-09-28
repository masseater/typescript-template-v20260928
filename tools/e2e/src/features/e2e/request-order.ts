import { Effect } from "effect";

import type { Page } from "playwright";

type Watched = Readonly<{ answered: string; started: string; timeout: number }>;

type Sighting<Seen extends string> = Readonly<
  { seen: Seen } | { failure: unknown; seen: "neither" }
>;

const pathnameOf = (url: string): string => new URL(url).pathname;

const requestStarted = (page: Page, watched: Watched): Effect.Effect<Sighting<"started">> =>
  Effect.tryPromise(() =>
    page.waitForRequest(
      (sentRequest) =>
        sentRequest.method() === "GET" && pathnameOf(sentRequest.url()) === watched.started,
      { timeout: watched.timeout },
    ),
  ).pipe(
    Effect.match({
      onFailure: (timedOut): Sighting<"started"> => ({ failure: timedOut, seen: "neither" }),
      onSuccess: (): Sighting<"started"> => ({ seen: "started" }),
    }),
  );

const responseAnswered = (page: Page, watched: Watched): Effect.Effect<Sighting<"answered">> =>
  Effect.tryPromise(() =>
    page.waitForResponse(
      (receivedResponse) =>
        receivedResponse.request().method() === "GET" &&
        pathnameOf(receivedResponse.url()) === watched.answered,
      { timeout: watched.timeout },
    ),
  ).pipe(
    Effect.match({
      onFailure: (timedOut): Sighting<"answered"> => ({ failure: timedOut, seen: "neither" }),
      onSuccess: (): Sighting<"answered"> => ({ seen: "answered" }),
    }),
  );

const firstOfRequestAndAnswer = (
  page: Page,
  watched: Watched,
): Promise<Sighting<"answered"> | Sighting<"started">> =>
  Effect.runPromise(Effect.race(requestStarted(page, watched), responseAnswered(page, watched)));

export { firstOfRequestAndAnswer };
