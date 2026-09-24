import { isPlainObject } from "es-toolkit";

import type { Options } from "@oxlint/plugins";

export const listedUnder = (
  ruleOptions: Readonly<Options>,
  named: string,
): readonly Readonly<Record<string, unknown>>[] => {
  const [first]: readonly unknown[] = ruleOptions;
  if (!isPlainObject(first)) return [];

  const listed = first[named];
  if (!Array.isArray(listed)) return [];
  return listed.filter((held) => isPlainObject(held));
};
