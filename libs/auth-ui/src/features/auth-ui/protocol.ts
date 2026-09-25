import { accountPermissions, roles } from "@repo/config";
import { ApiFailed } from "@repo/runtime/client";
import { Predicate, Result, Schema } from "effect";

const SessionView = Schema.Struct({
  strong: Schema.Boolean,
  user: Schema.Struct({
    email: Schema.String,
    id: Schema.String,
    name: Schema.String,
    permission: Schema.NullOr(Schema.Literals(accountPermissions)),
    role: Schema.Literals(roles),
    twoFactorEnabled: Schema.Boolean,
  }),
});

const decodeJson = <Contract extends Schema.Top & { readonly DecodingServices: never }>(
  contract: Contract,
  input: unknown,
): Contract["Type"] => {
  const decoded = Schema.decodeUnknownResult(contract)(input);
  if (Result.isFailure(decoded)) {
    throw new ApiFailed({ cause: decoded.failure, reason: "response_invalid" });
  }
  return decoded.success;
};

const requireSuccess = <TData>(
  authEnvelope: Readonly<{
    data: TData;
    error: Readonly<{ code?: string | undefined; message?: string | undefined }> | null;
  }>,
): NonNullable<TData> => {
  if (authEnvelope.error) {
    const { code, message } = authEnvelope.error;
    throw new ApiFailed({
      ...(code === undefined ? {} : { code }),
      ...(message === undefined ? {} : { detail: message }),
      reason: "rejected",
    });
  }
  if (authEnvelope.data === null || authEnvelope.data === undefined) {
    throw new ApiFailed({ reason: "response_empty" });
  }
  return authEnvelope.data;
};

const requireSecureContext = (): void => {
  if (!globalThis.isSecureContext) {
    throw new Error("パスキーには HTTPS または localhost が必要です。");
  }
};

const authenticateOptionsPath = "/passkey/generate-authenticate-options";
const registerOptionsPath = "/passkey/generate-register-options";

const isPasskeyOptionsPath = (pathname: string): boolean => {
  return pathname.endsWith(authenticateOptionsPath) || pathname.endsWith(registerOptionsPath);
};

const registrationWithUserVerification = (
  passkeyOptions: Readonly<Record<string, unknown>>,
): Record<string, unknown> => {
  const selection = passkeyOptions["authenticatorSelection"];
  if (selection !== undefined && !Predicate.isObject(selection)) {
    throw new Error("パスキー登録設定の応答形式が不正です。");
  }
  return {
    ...passkeyOptions,
    authenticatorSelection: { ...selection, userVerification: "required" },
  };
};

const passkeyUVOptions = (
  passkeyOptions: unknown,
  pathname: string,
): Readonly<Record<string, unknown>> => {
  if (!Predicate.isObject(passkeyOptions)) {
    throw new Error("パスキー設定の応答形式が不正です。");
  }
  return pathname.endsWith(authenticateOptionsPath)
    ? { ...passkeyOptions, userVerification: "required" }
    : registrationWithUserVerification(passkeyOptions);
};

export {
  SessionView,
  decodeJson,
  isPasskeyOptionsPath,
  passkeyUVOptions,
  requireSecureContext,
  requireSuccess,
};
export type SessionView = typeof SessionView.Type;
