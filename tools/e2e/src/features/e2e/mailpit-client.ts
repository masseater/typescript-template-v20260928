import { Effect, Schema } from "effect";

import { failed, type JourneyFailure } from "./journey-failure.ts";
import { deliveryTimeout, mailLinkPattern } from "./mail.ts";
import { deadlineIn, until } from "./waiting.ts";

const MailpitInbox = Schema.Struct({
  messages: Schema.Array(Schema.Struct({ ID: Schema.String })),
});

const MailpitMessage = Schema.Struct({
  Text: Schema.String,
});

const findLink = (search: {
  readonly deliveries: readonly string[];
  readonly prefix: string;
  readonly recipient: string;
}): string | undefined => {
  return search.deliveries
    .filter((delivery) => delivery.includes(search.recipient))
    .flatMap((delivery) => [...delivery.matchAll(mailLinkPattern)].map(([link]) => link))
    .find((link) => link.startsWith(search.prefix));
};

const fetchMailpitJson = <Decoded>(mailpitRequest: {
  readonly fetchImpl: typeof fetch;
  readonly invalidReason: string;
  readonly schema: Schema.Decoder<Decoded>;
  readonly unreachableReason: string;
  readonly url: string;
}): Effect.Effect<Decoded, JourneyFailure> =>
  Effect.gen(function* loadMailpitJson() {
    const mailpitHttpReply = yield* Effect.tryPromise({
      catch: (cause) => failed(mailpitRequest.unreachableReason, cause),
      try: (signal) => mailpitRequest.fetchImpl(mailpitRequest.url, { signal }),
    });
    if (!mailpitHttpReply.ok) {
      return yield* failed(
        mailpitRequest.unreachableReason,
        `HTTP ${String(mailpitHttpReply.status)}`,
      );
    }
    const mailpitJson = yield* Effect.tryPromise({
      catch: (cause) => failed(mailpitRequest.invalidReason, cause),
      try: () => mailpitHttpReply.json(),
    });
    return yield* Schema.decodeUnknownEffect(mailpitRequest.schema)(mailpitJson).pipe(
      Effect.mapError((cause) => failed(mailpitRequest.invalidReason, cause)),
    );
  });

const messageText = (mailpitMessage: typeof MailpitMessage.Type): string => mailpitMessage.Text;

const searchInbox = (inboxSearch: {
  readonly fetchImpl: typeof fetch;
  readonly messageUrl: (messageId: string) => string;
  readonly searchUrl: string;
}): Effect.Effect<readonly string[], JourneyFailure> =>
  Effect.gen(function* loadMailpitInbox() {
    const mailpitInbox = yield* fetchMailpitJson({
      fetchImpl: inboxSearch.fetchImpl,
      invalidReason: "MAILPIT_REPLY_INVALID",
      schema: MailpitInbox,
      unreachableReason: "MAILPIT_UNREACHABLE",
      url: inboxSearch.searchUrl,
    });
    return yield* Effect.forEach(mailpitInbox.messages, (inboxRow) =>
      fetchMailpitJson({
        fetchImpl: inboxSearch.fetchImpl,
        invalidReason: "MAILPIT_REPLY_INVALID",
        schema: MailpitMessage,
        unreachableReason: "MAILPIT_MESSAGE_UNAVAILABLE",
        url: inboxSearch.messageUrl(inboxRow.ID),
      }).pipe(Effect.map(messageText)),
    );
  });

const waitForMailpitLink = (linkSearch: {
  readonly messageUrl: (messageId: string) => string;
  readonly prefix: string;
  readonly recipient: string;
  readonly searchUrl: string;
}): Effect.Effect<string, JourneyFailure> =>
  until({
    attempt: () =>
      searchInbox({
        fetchImpl: fetch,
        messageUrl: linkSearch.messageUrl,
        searchUrl: linkSearch.searchUrl,
      }).pipe(
        Effect.map((deliveries) =>
          findLink({
            deliveries,
            prefix: linkSearch.prefix,
            recipient: linkSearch.recipient,
          }),
        ),
      ),
    deadline: deadlineIn(deliveryTimeout),
    reason: "VERIFY_VERIFICATION_MAIL_NOT_DELIVERED",
  });

export { waitForMailpitLink };
