import { forbidTrackedPath } from "../../lint/oxlint/rules/toolchain/forbid-tracked-path--untrack-and-ignore.ts";
import { noStandaloneTsconfig } from "../../lint/oxlint/rules/toolchain/no-standalone-tsconfig--extend-shared-preset.ts";
import { noUncheckedAuthoredPath } from "../../lint/oxlint/rules/toolchain/no-unchecked-authored-path--include-it-in-every-declared-check.ts";
import { noUnguardedFilteredRun } from "../../lint/oxlint/rules/toolchain/no-unguarded-filtered-run--add-fail-if-no-match.ts";
import { requireRegisteredFile } from "../../lint/oxlint/rules/toolchain/require-registered-file--restore-it-at-the-registered-path.ts";
import { noVersionRange, requireCatalogEntry } from "../../plugin.ts";

import type { WorkspaceLintRule } from "../../lint-rule-authoring/index.ts";

export const toolchainBundle: readonly WorkspaceLintRule[] = [
  forbidTrackedPath,
  noStandaloneTsconfig,
  noUncheckedAuthoredPath,
  noUnguardedFilteredRun,
  noVersionRange,
  requireCatalogEntry,
  requireRegisteredFile,
];
