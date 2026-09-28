import { Schema } from "effect";

const isCodedFailure = Schema.is(Schema.Struct({ code: Schema.String }));

const isCausedFailure = Schema.is(Schema.Struct({ cause: Schema.Unknown }));

const isNamedFailure = Schema.is(Schema.Struct({ name: Schema.String, message: Schema.String }));

export const failedWithCode = (failure: unknown, codes: ReadonlySet<string>): boolean => {
  if (isCodedFailure(failure)) return codes.has(failure.code);
  return isCausedFailure(failure) && failedWithCode(failure.cause, codes);
};

export const failureSpelling = (failure: unknown): string => {
  if (isCodedFailure(failure)) return failure.code;
  if (isNamedFailure(failure)) return `${failure.name}: ${failure.message}`;
  return String(failure);
};
