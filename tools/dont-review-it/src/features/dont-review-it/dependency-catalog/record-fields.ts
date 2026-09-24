import { isPlainObject } from "es-toolkit";

export const stringEntriesOf = (declared: unknown): readonly (readonly [string, string])[] =>
  isPlainObject(declared)
    ? Object.entries(declared).filter(
        (listed): listed is [string, string] => typeof listed[1] === "string",
      )
    : [];
