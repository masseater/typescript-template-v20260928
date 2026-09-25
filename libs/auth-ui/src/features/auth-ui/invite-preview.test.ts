import { Effect, Exit } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { InvitePreviewFailed } from "./invite-preview-failed.ts";
import { loadInvitation, readInvitation } from "./invite-preview.ts";

describe("readInvitation", () => {
  describe("a served preview", () => {
    const it = test.extend("theInvitation", () =>
      Effect.runPromiseExit(
        readInvitation({
          json: Effect.succeed({ email: "invited@example.com", permission: "viewer" }),
          status: 200,
        }),
      ));

    it("is available for the invited email", ({ theInvitation }) => {
      expect(theInvitation).toStrictEqual(
        Exit.succeed({ email: "invited@example.com", status: "available" }),
      );
    });
  });

  describe("a 404 answer", () => {
    const it = test.extend("theClosedInvitation", () =>
      Effect.runPromiseExit(
        readInvitation({ json: Effect.succeed({ error: "missing" }), status: 404 }),
      ));

    it("is closed", ({ theClosedInvitation }) => {
      expect(theClosedInvitation).toStrictEqual(Exit.succeed({ status: "closed" }));
    });
  });

  describe("a 503 answer", () => {
    const it = test.extend("theFailedInvitation", () =>
      Effect.runPromiseExit(
        readInvitation({ json: Effect.succeed({ error: "unavailable" }), status: 503 }),
      ));

    it("fails with the answered status", ({ theFailedInvitation }) => {
      expect(theFailedInvitation).toStrictEqual(
        Exit.fail(new InvitePreviewFailed({ status: 503 })),
      );
    });
  });

  describe("a 500 answer whose body does not decode", () => {
    const it = test.extend("theUndecodedFailure", () =>
      Effect.runPromiseExit(readInvitation({ json: Effect.succeed("<html>"), status: 500 })));

    it("fails with the answered status", ({ theUndecodedFailure }) => {
      expect(theUndecodedFailure).toStrictEqual(
        Exit.fail(new InvitePreviewFailed({ status: 500 })),
      );
    });
  });
});

describe("loadInvitation", () => {
  describe("a server that refuses the connection", () => {
    const it = test.extend("theFailureTag", () =>
      Effect.runPromise(
        loadInvitation(new URL("http://127.0.0.1:0/api/invite?token=t")).pipe(
          Effect.flip,
          Effect.map((failure) => failure._tag),
        ),
      ));

    it("fails as unreachable", ({ theFailureTag }) => {
      expect(theFailureTag).toBe("InvitePreviewUnreachable");
    });
  });
});
