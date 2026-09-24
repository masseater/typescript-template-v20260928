import { Effect, Schema } from "effect";

import { failed, type JourneyFailure } from "./journey-failure.ts";
import { deliveryTimeout, mailLinkPattern } from "./mail.ts";
import { deadlineIn, until } from "./waiting.ts";

const MailboxDeliveries = Schema.Array(
  Schema.Struct({
    link: Schema.String,
    recipient: Schema.String,
  }),
);

const linksInDelivery = (deliveryLink: string, linkPattern: Readonly<RegExp>): readonly string[] =>
  [...deliveryLink.matchAll(linkPattern)].map(([matchedLink]) => matchedLink);

const fetchMailboxDeliveries = (deliverySearch: {
  readonly deliveriesUrl: string;
  readonly fetchImpl: typeof fetch;
  readonly recipient: string;
}): Effect.Effect<typeof MailboxDeliveries.Type, JourneyFailure> =>
  Effect.gen(function* loadMailboxDeliveries() {
    const mailboxHttpReply = yield* Effect.tryPromise({
      catch: (cause) => failed("MAILBOX_UNREACHABLE", cause),
      try: (signal) => deliverySearch.fetchImpl(deliverySearch.deliveriesUrl, { signal }),
    });
    if (!mailboxHttpReply.ok) {
      return yield* failed("MAILBOX_UNREACHABLE", `HTTP ${String(mailboxHttpReply.status)}`);
    }
    const mailboxJson = yield* Effect.tryPromise({
      catch: (cause) => failed("MAILBOX_REPLY_INVALID", cause),
      try: () => mailboxHttpReply.json(),
    });
    const mailboxDeliveries = yield* Schema.decodeUnknownEffect(MailboxDeliveries)(
      mailboxJson,
    ).pipe(Effect.mapError((cause) => failed("MAILBOX_REPLY_INVALID", cause)));
    return mailboxDeliveries.filter(
      (mailboxDelivery) => mailboxDelivery.recipient === deliverySearch.recipient,
    );
  });

const waitForMailboxLink = (linkSearch: {
  readonly deliveriesUrl: string;
  readonly prefix: string;
  readonly recipient: string;
}): Effect.Effect<string, JourneyFailure> =>
  until({
    attempt: () =>
      fetchMailboxDeliveries({
        deliveriesUrl: linkSearch.deliveriesUrl,
        fetchImpl: fetch,
        recipient: linkSearch.recipient,
      }).pipe(
        Effect.map((mailboxDeliveries) =>
          mailboxDeliveries
            .flatMap((mailboxDelivery) => linksInDelivery(mailboxDelivery.link, mailLinkPattern))
            .find((matchedLink) => matchedLink.startsWith(linkSearch.prefix)),
        ),
      ),
    deadline: deadlineIn(deliveryTimeout),
    reason: "VERIFY_VERIFICATION_MAIL_NOT_DELIVERED",
  });

export { waitForMailboxLink };
