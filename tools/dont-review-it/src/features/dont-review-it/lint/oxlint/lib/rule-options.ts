import { isPlainObject } from "es-toolkit";

import type { Options } from "@oxlint/plugins";

export const optionsRecord = (
  ruleConfiguration: Readonly<Options>,
): Readonly<Record<string, unknown>> | null => {
  const [first]: readonly unknown[] = ruleConfiguration;
  if (!isPlainObject(first)) return null;
  return first;
};
