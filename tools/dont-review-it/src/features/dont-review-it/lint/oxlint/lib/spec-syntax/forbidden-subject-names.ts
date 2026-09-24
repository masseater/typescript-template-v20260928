import { isPlainObject } from "es-toolkit";

import type { Options } from "@oxlint/plugins";
import type { ForbiddenNamePattern } from "../forbidden-ambiguous-names.ts";

const FORBIDDEN_SUBJECT_NAMES_OPTION = "forbiddenSubjectNames";

const patternEntry = (listed: unknown): ForbiddenNamePattern | null => {
  if (!isPlainObject(listed)) return null;

  const pattern: unknown = listed.pattern;
  return typeof pattern === "string" ? { pattern } : null;
};

export const forbiddenSubjectNamesFrom = (
  ruleOptions: Readonly<Options>,
): readonly ForbiddenNamePattern[] => {
  const [first]: readonly unknown[] = ruleOptions;
  if (!isPlainObject(first)) return [];

  const configured = first[FORBIDDEN_SUBJECT_NAMES_OPTION];
  if (!Array.isArray(configured)) return [];
  return configured.flatMap((listed) => patternEntry(listed) ?? []);
};
