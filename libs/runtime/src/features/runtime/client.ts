import { treaty } from "@elysia/eden";
import { httpStatus } from "@repo/config";
import { Result, Schema } from "effect";

import { ApiFailed } from "./api-failed.ts";
import { ErrorBody } from "./contracts.ts";

import type { AnyElysia } from "elysia";
import type { Decodable } from "./contracts.ts";
type ApiReply = {
  readonly data: unknown;
  readonly error: {
    readonly status: number;
    readonly value: unknown;
  } | null;
  readonly response: Readonly<Pick<Response, "headers">>;
};
const decodeJson = <Contract extends Decodable>(
  contract: Contract,
  input: unknown,
): Contract["Type"] => {
  const decoded = Schema.decodeUnknownResult(contract)(input);
  if (Result.isFailure(decoded)) {
    throw new ApiFailed({ cause: decoded.failure, reason: "response_invalid" });
  }
  return decoded.success;
};
const rejection = (
  answered: Readonly<Pick<Response, "headers" | "status">>,
  requestBody: unknown,
): ApiFailed => {
  const failure = Schema.decodeUnknownResult(ErrorBody)(requestBody);
  const requestId = answered.headers.get("x-request-id") ?? "";
  return new ApiFailed({
    ...(Result.isSuccess(failure) ? { detail: failure.success.error } : {}),
    reason: "rejected",
    ...(requestId === "" ? {} : { requestId }),
    status: answered.status,
  });
};
const apiData = <Contract extends Decodable>(
  contract: Contract,
  answered: ApiReply,
): Contract["Type"] => {
  if (answered.error !== null) {
    throw rejection(
      { headers: answered.response.headers, status: answered.error.status },
      answered.error.value,
    );
  }
  return decodeJson(contract, answered.data);
};
const absent = {
  notFound: httpStatus.notFound,
  unauthorized: httpStatus.unauthorized,
} as const;
const apiDataOrNone = <Contract extends Decodable>(
  contract: Contract,
  answered: ApiReply,
): Contract["Type"] | undefined => {
  return answered.error?.status === absent.unauthorized ? undefined : apiData(contract, answered);
};
const apiDataOrNoneFor = (absentStatus: (typeof absent)[keyof typeof absent]) => {
  return <Contract extends Decodable>(
    contract: Contract,
    answered: ApiReply,
  ): Contract["Type"] | undefined => {
    return answered.error?.status === absentStatus ? undefined : apiData(contract, answered);
  };
};
const apiServerClient = <App extends AnyElysia>(
  app: App,
  headers: Readonly<Record<string, string>>,
): ReturnType<typeof treaty<App, string>> => {
  return treaty(app, { headers, parseDate: false });
};
const apiClient = <App extends AnyElysia>(): ReturnType<typeof treaty<App>> => {
  return treaty<App>(globalThis.location.origin, {
    fetch: { cache: "no-store", credentials: "same-origin", redirect: "error" },
    parseDate: false,
  });
};
export {
  ApiFailed,
  absent,
  apiClient,
  apiData,
  apiDataOrNone,
  apiDataOrNoneFor,
  apiServerClient,
  decodeJson,
  rejection,
};
export type { ApiReply };
