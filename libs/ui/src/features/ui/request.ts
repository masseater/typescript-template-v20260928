import { ApiFailed } from "@repo/runtime/client";
import { Cause, Effect, Option, Schema } from "effect";
import { AsyncResult, Atom } from "effect/unstable/reactivity";

class RequestFailed extends Schema.TaggedError<RequestFailed>()("RequestFailed", {
  cause: Schema.Defect(),
}) {}

const requestEffect = <Value>(task: () => Promise<Value>): Effect.Effect<Value, RequestFailed> => {
  return Effect.tryPromise({
    catch: (cause) => new RequestFailed({ cause }),
    try: task,
  });
};

type RequestResult<Value> = AsyncResult.AsyncResult<Value, RequestFailed>;

const requestAtom = <Value>(task: () => Promise<Value>): Atom.Atom<RequestResult<Value>> => {
  return Atom.make(requestEffect(task)).pipe(Atom.withServerValueInitial);
};

const knownRejections: Readonly<Record<string, string>> = {
  "Email is the same": "いまのメールアドレスと同じです。",
  EMAIL_NOT_VERIFIED: "メールアドレスが未確認です。確認メールのリンクを開いてください。",
  INVALID_BACKUP_CODE: "バックアップコードが違います。",
  INVALID_CODE: "確認コードが違います。",
  INVALID_EMAIL_OR_PASSWORD: "メールアドレスかパスワードが違います。",
  STRONG_AUTH_REQUIRED: "認証アプリかパスキーで確認してから、もう一度お試しください。",
};

const rejectionText = (
  rejected: Readonly<Pick<ApiFailed, "code" | "detail" | "status">>,
): string => {
  const known = knownRejections[rejected.code ?? rejected.detail ?? ""];
  if (known !== undefined) {
    return known;
  }
  if (rejected.detail !== undefined) {
    return rejected.detail;
  }
  if (rejected.code !== undefined) {
    return `サーバーが未知の失敗コードを返しました: ${rejected.code}`;
  }
  return rejected.status === undefined
    ? "サーバーが失敗理由のコードを返しませんでした。"
    : `リクエストに失敗しました（HTTP ${String(rejected.status)}）。`;
};

const apiFailureTexts: Readonly<
  Record<
    ApiFailed["reason"],
    (apiFailure: Readonly<Pick<ApiFailed, "code" | "detail" | "status">>) => string
  >
> = {
  rejected: rejectionText,
  response_empty: () => "サーバーから結果が返りませんでした。",
  response_invalid: () => "サーバーの応答形式が不正です。",
};

const apiFailureText = (
  apiFailure: Readonly<Pick<ApiFailed, "code" | "detail" | "reason" | "requestId" | "status">>,
): string => {
  const described = apiFailureTexts[apiFailure.reason](apiFailure);
  return apiFailure.requestId === undefined
    ? described
    : `${described} リクエスト ID: ${apiFailure.requestId}`;
};

const failureText = (failure: unknown): string => {
  if (Schema.is(RequestFailed)(failure)) {
    return failureText(failure.cause);
  }
  if (Schema.is(ApiFailed)(failure)) {
    return apiFailureText(failure);
  }
  return failure instanceof Error
    ? failure.message
    : "操作に失敗しました。もう一度お試しください。";
};

const resultError = (asyncState: object): string | undefined => {
  const settled = asyncState as RequestResult<unknown>;
  if (
    !AsyncResult.isFailure(settled) ||
    settled.waiting ||
    Cause.hasInterruptsOnly(settled.cause)
  ) {
    return undefined;
  }
  return failureText(
    Option.getOrThrowWith(AsyncResult.error(settled), () => Cause.squash(settled.cause)),
  );
};

export { failureText, requestEffect as request, requestAtom, resultError };
export type { RequestFailed, RequestResult };
