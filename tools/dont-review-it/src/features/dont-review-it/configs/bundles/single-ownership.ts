import { forbidPackageSymbolRelay } from "../../lint/oxlint/rules/single-ownership/forbid-package-symbol-relay--import-from-the-owner.ts";
import {
  noDuplicateValueDeclaration,
  noDuplicatedBody,
  noLocalFiniteValueSet,
  noSplitTypeAuthority,
  noTwinDeclaration,
} from "../../plugin.ts";

import type { WorkspaceLintRule } from "../../lint-rule-authoring/index.ts";

export const singleOwnershipBundle: readonly WorkspaceLintRule[] = [
  forbidPackageSymbolRelay,
  noDuplicateValueDeclaration,
  noDuplicatedBody,
  noLocalFiniteValueSet,
  noSplitTypeAuthority,
  noTwinDeclaration,
];
