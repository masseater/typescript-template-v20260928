import { ApiFailed } from "@repo/runtime/client";
import { Schema } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { SessionView, decodeJson, passkeyUVOptions, requireSuccess } from "./protocol.ts";

const authenticateOptionsPathname = "/api/auth/passkey/generate-authenticate-options";
const registerOptionsPathname = "/api/auth/passkey/generate-register-options";

describe("パスキー応答の本人確認", () => {
  const it = test
    .extend("theAuthenticationOptions", () =>
      passkeyUVOptions(
        { challenge: "challenge", userVerification: "preferred" },
        authenticateOptionsPathname,
      ))
    .extend("theRegistrationOptionsCarryingAnAuthenticatorSelection", () =>
      passkeyUVOptions(
        { authenticatorSelection: { residentKey: "required", userVerification: "discouraged" } },
        registerOptionsPathname,
      ),
    )
    .extend("theRegistrationOptionsWithoutAnAuthenticatorSelection", () =>
      passkeyUVOptions({ challenge: "challenge" }, registerOptionsPathname),
    );

  it("認証要求では既存の challenge を維持して本人確認を必須にする", ({
    theAuthenticationOptions,
  }) => {
    expect(theAuthenticationOptions).toStrictEqual({
      challenge: "challenge",
      userVerification: "required",
    });
  });

  it("登録要求では認証器の指定を維持して本人確認を必須にする", ({
    theRegistrationOptionsCarryingAnAuthenticatorSelection,
  }) => {
    expect(theRegistrationOptionsCarryingAnAuthenticatorSelection).toStrictEqual({
      authenticatorSelection: { residentKey: "required", userVerification: "required" },
    });
  });

  it("登録要求に認証器の指定がなくても本人確認を必須にする", ({
    theRegistrationOptionsWithoutAnAuthenticatorSelection,
  }) => {
    expect(theRegistrationOptionsWithoutAnAuthenticatorSelection).toStrictEqual({
      authenticatorSelection: { userVerification: "required" },
      challenge: "challenge",
    });
  });
});

describe("パスキー応答の形式検証", () => {
  const it = test
    .extend("theRefusalOfANonRecordPasskeyResponse", () => {
      try {
        passkeyUVOptions(null, registerOptionsPathname);
      } catch (refusal) {
        return refusal;
      }
      throw new Error("passkeyUVOptions accepted a passkey response that is not a record");
    })
    .extend("theRefusalOfAnInvalidAuthenticatorSelection", () => {
      try {
        passkeyUVOptions({ authenticatorSelection: "invalid" }, registerOptionsPathname);
      } catch (refusal) {
        return refusal;
      }
      throw new Error("passkeyUVOptions accepted an authenticator selection that is not a record");
    });

  it("レコードでないパスキー設定の応答を拒否する", ({ theRefusalOfANonRecordPasskeyResponse }) => {
    expect(theRefusalOfANonRecordPasskeyResponse).toStrictEqual(
      new Error("パスキー設定の応答形式が不正です。"),
    );
  });

  it("レコードでない認証器の指定を拒否する", ({ theRefusalOfAnInvalidAuthenticatorSelection }) => {
    expect(theRefusalOfAnInvalidAuthenticatorSelection).toStrictEqual(
      new Error("パスキー登録設定の応答形式が不正です。"),
    );
  });
});

describe("認証結果の検証", () => {
  const it = test
    .extend("theRefusalOfAnAuthenticationFailure", () => {
      try {
        requireSuccess({ data: null, error: { message: "SESSION_INVALID" } });
      } catch (refusal) {
        return refusal;
      }
      throw new Error("requireSuccess accepted an authentication failure");
    })
    .extend("theRefusalOfANullPayload", () => {
      try {
        requireSuccess({ data: null, error: null });
      } catch (refusal) {
        return refusal;
      }
      throw new Error("requireSuccess accepted a null payload");
    })
    .extend("theRefusalOfAMissingPayload", () => {
      try {
        requireSuccess({ data: undefined, error: null });
      } catch (refusal) {
        return refusal;
      }
      throw new Error("requireSuccess accepted a missing payload");
    })
    .extend("theRefusalOfAKnownFailureCode", () => {
      try {
        requireSuccess({
          data: undefined,
          error: { code: "INVALID_EMAIL_OR_PASSWORD", message: "Upstream wording" },
        });
      } catch (refusal) {
        return refusal;
      }
      throw new Error("requireSuccess accepted a known failure code");
    })
    .extend("theRefusalOfAnUnknownCodeWithoutMessage", () => {
      try {
        requireSuccess({ data: undefined, error: { code: "SOMETHING_ELSE" } });
      } catch (refusal) {
        return refusal;
      }
      throw new Error("requireSuccess accepted an unknown code without a message");
    })
    .extend("theAcceptedPayload", () => requireSuccess({ data: { status: true }, error: null }));

  it("認証の失敗を、サーバーの文言を持つ拒否として投げる", ({
    theRefusalOfAnAuthenticationFailure,
  }) => {
    expect(theRefusalOfAnAuthenticationFailure).toStrictEqual(
      new ApiFailed({ detail: "SESSION_INVALID", reason: "rejected" }),
    );
  });

  it("結果が null の応答を成功扱いにしない", ({ theRefusalOfANullPayload }) => {
    expect(theRefusalOfANullPayload).toStrictEqual(new ApiFailed({ reason: "response_empty" }));
  });

  it("結果が欠けた応答を成功扱いにしない", ({ theRefusalOfAMissingPayload }) => {
    expect(theRefusalOfAMissingPayload).toStrictEqual(new ApiFailed({ reason: "response_empty" }));
  });

  it("失敗コードを文言に変えずに渡す", ({ theRefusalOfAKnownFailureCode }) => {
    expect(theRefusalOfAKnownFailureCode).toStrictEqual(
      new ApiFailed({
        code: "INVALID_EMAIL_OR_PASSWORD",
        detail: "Upstream wording",
        reason: "rejected",
      }),
    );
  });

  it("メッセージの無い失敗コードもコードのまま渡す", ({
    theRefusalOfAnUnknownCodeWithoutMessage,
  }) => {
    expect(theRefusalOfAnUnknownCodeWithoutMessage).toStrictEqual(
      new ApiFailed({ code: "SOMETHING_ELSE", reason: "rejected" }),
    );
  });

  it("結果を伴う成功はそのまま渡す", ({ theAcceptedPayload }) => {
    expect(theAcceptedPayload).toStrictEqual({ status: true });
  });
});

describe("セッション応答の検証", () => {
  const signedInUser = {
    email: "user@example.com",
    id: "user-id",
    name: "名前",
    permission: null,
    role: "member",
    twoFactorEnabled: false,
  };
  const it = test
    .extend("theDecodedSession", () =>
      decodeJson(SessionView, { strong: false, user: signedInUser }))
    .extend("theRefusalOfASessionWithoutStrength", () => {
      try {
        decodeJson(SessionView, { user: signedInUser });
      } catch (refusal) {
        return Schema.is(ApiFailed)(refusal) ? refusal.reason : refusal;
      }
      throw new Error("decodeJson accepted a session without strength");
    })
    .extend("theRefusalOfASessionWhoseStrengthIsText", () => {
      try {
        decodeJson(SessionView, { strong: "true", user: signedInUser });
      } catch (refusal) {
        return Schema.is(ApiFailed)(refusal) ? refusal.reason : refusal;
      }
      throw new Error("decodeJson accepted a session whose strength is text");
    })
    .extend("theRefusalOfASessionCarryingAnUnknownRole", () => {
      try {
        decodeJson(SessionView, { strong: true, user: { ...signedInUser, role: "root" } });
      } catch (refusal) {
        return Schema.is(ApiFailed)(refusal) ? refusal.reason : refusal;
      }
      throw new Error("decodeJson accepted a session carrying an unknown role");
    });

  it("強度とロールを備えた応答をそのまま読む", ({ theDecodedSession }) => {
    expect(theDecodedSession).toStrictEqual({ strong: false, user: signedInUser });
  });

  it("強度を持たない応答を拒否する", ({ theRefusalOfASessionWithoutStrength }) => {
    expect(theRefusalOfASessionWithoutStrength).toBe("response_invalid");
  });

  it("強度が文字列の応答を拒否する", ({ theRefusalOfASessionWhoseStrengthIsText }) => {
    expect(theRefusalOfASessionWhoseStrengthIsText).toBe("response_invalid");
  });

  it("知らないロールを持つ応答を拒否する", ({ theRefusalOfASessionCarryingAnUnknownRole }) => {
    expect(theRefusalOfASessionCarryingAnUnknownRole).toBe("response_invalid");
  });
});
