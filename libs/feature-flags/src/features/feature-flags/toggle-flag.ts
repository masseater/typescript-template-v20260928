import { Effect } from "effect";

import { recordFlagToggle } from "./audit.ts";
import { flagDefinitionFor, type FlagKey } from "./flag-vocabulary.ts";
import { type FlagshipWriteConfig, writeFlag } from "./flagship-write.ts";
import { FeatureFlags } from "./service.ts";

const toggleFlag = Effect.fn("toggleFlag")(function* toggleFlag(change: {
  readonly actorId: string;
  readonly enabled: boolean;
  readonly key: FlagKey;
}) {
  const featureFlags = yield* FeatureFlags;
  const previousEnabled = yield* featureFlags.getBoolean(change.key);
  if (previousEnabled === change.enabled) {
    const definition = flagDefinitionFor(change.key);
    return { description: definition.description, enabled: previousEnabled, key: change.key };
  }
  const toggledFlag = yield* featureFlags.setBoolean(change.key, change.enabled);
  yield* recordFlagToggle({
    actorId: change.actorId,
    flagKey: change.key,
    from: previousEnabled,
    to: change.enabled,
  });
  return toggledFlag;
});

const toggleFlagRemote = Effect.fn("toggleFlagRemote")(function* toggleFlagRemote(
  config: FlagshipWriteConfig,
  change: {
    readonly actorId: string;
    readonly enabled: boolean;
    readonly key: FlagKey;
  },
) {
  const flagshipWrite = yield* writeFlag({
    config,
    enabled: change.enabled,
    flagKey: change.key,
  });
  yield* recordFlagToggle({
    actorId: change.actorId,
    flagKey: change.key,
    from: flagshipWrite.previous,
    to: change.enabled,
  });
  return {
    description: "",
    enabled: flagshipWrite.enabled,
    key: flagshipWrite.flagKey,
  };
});

export { toggleFlag, toggleFlagRemote };
