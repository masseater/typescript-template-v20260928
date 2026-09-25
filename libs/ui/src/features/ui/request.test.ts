import { ApiFailed } from "@repo/runtime/client";
import { Cause, Effect } from "effect";
import { AsyncResult } from "effect/unstable/reactivity";
import { describe, expect, test } from "vite-plus/test";

import { failureText, request, resultError } from "./request.ts";

describe("failureText", () => {
  const it = test
    .extend("theTextOfAThrownError", () => failureText(new Error("<script>alert(1)</script>")))
    .extend("theTextOfAThrownString", () => failureText("<script>alert(1)</script>"))
    .extend("theTextOfAKnownCode", () =>
      failureText(
        new ApiFailed({
          code: "INVALID_EMAIL_OR_PASSWORD",
          detail: "Upstream wording",
          reason: "rejected",
        }),
      ),
    )
    .extend("theTextOfAnUnverifiedEmail", () =>
      failureText(new ApiFailed({ code: "EMAIL_NOT_VERIFIED", reason: "rejected" })),
    )
    .extend("theTextOfAnUnmappedCode", () =>
      failureText(
        new ApiFailed({ code: "SOMETHING_ELSE", detail: "Upstream wording", reason: "rejected" }),
      ),
    )
    .extend("theTextOfAnUnknownCodeWithoutDetail", () =>
      failureText(new ApiFailed({ code: "SOMETHING_ELSE", reason: "rejected" })),
    )
    .extend("theTextOfARejectionWithoutCode", () =>
      failureText(new ApiFailed({ reason: "rejected" })),
    )
    .extend("theTextOfAnHttpRejection", () =>
      failureText(new ApiFailed({ reason: "rejected", requestId: "req-1", status: 503 })),
    )
    .extend("theTextOfAnInvalidResponse", () =>
      failureText(new ApiFailed({ cause: new Error("decode"), reason: "response_invalid" })),
    )
    .extend("theTextOfAnEmptyResponse", () =>
      failureText(new ApiFailed({ reason: "response_empty" })),
    );

  it("shows the message of a thrown Error as it is", ({ theTextOfAThrownError }) => {
    expect(theTextOfAThrownError).toBe("<script>alert(1)</script>");
  });

  it("shows a shared text for a failure that is not an Error", ({ theTextOfAThrownString }) => {
    expect(theTextOfAThrownString).toBe("操作に失敗しました。もう一度お試しください。");
  });

  it("turns a failed sign-in code into its reason", ({ theTextOfAKnownCode }) => {
    expect(theTextOfAKnownCode).toBe("メールアドレスかパスワードが違います。");
  });

  it("turns an unverified email code into its reason", ({ theTextOfAnUnverifiedEmail }) => {
    expect(theTextOfAnUnverifiedEmail).toBe(
      "メールアドレスが未確認です。確認メールのリンクを開いてください。",
    );
  });

  it("keeps the server wording for a code without a reason", ({ theTextOfAnUnmappedCode }) => {
    expect(theTextOfAnUnmappedCode).toBe("Upstream wording");
  });

  it("names an unknown code that came without wording", ({
    theTextOfAnUnknownCodeWithoutDetail,
  }) => {
    expect(theTextOfAnUnknownCodeWithoutDetail).toBe(
      "サーバーが未知の失敗コードを返しました: SOMETHING_ELSE",
    );
  });

  it("says the server gave no code instead of a generic text", ({
    theTextOfARejectionWithoutCode,
  }) => {
    expect(theTextOfARejectionWithoutCode).toBe("サーバーが失敗理由のコードを返しませんでした。");
  });

  it("names the status and the request id of an HTTP rejection", ({ theTextOfAnHttpRejection }) => {
    expect(theTextOfAnHttpRejection).toBe(
      "リクエストに失敗しました（HTTP 503）。 リクエスト ID: req-1",
    );
  });

  it("says the response did not have the expected shape", ({ theTextOfAnInvalidResponse }) => {
    expect(theTextOfAnInvalidResponse).toBe("サーバーの応答形式が不正です。");
  });

  it("says the response carried no result", ({ theTextOfAnEmptyResponse }) => {
    expect(theTextOfAnEmptyResponse).toBe("サーバーから結果が返りませんでした。");
  });
});

describe("resultError", () => {
  const rejected = new ApiFailed({ code: "INVALID_CODE", reason: "rejected", status: 400 });
  const it = test
    .extend("theKeptCause", () =>
      Effect.runPromise(
        request(() => Promise.reject(rejected)).pipe(
          Effect.flip,
          Effect.map((failed) => failed.cause),
        ),
      ))
    .extend("theShownText", () =>
      resultError(AsyncResult.failure(Cause.fail(new Error("取得できませんでした。")))),
    );

  it("keeps the original failure as the cause of a failed request", ({ theKeptCause }) => {
    expect(theKeptCause).toBe(rejected);
  });

  it("shows the text of a failed result", ({ theShownText }) => {
    expect(theShownText).toBe("取得できませんでした。");
  });
});
