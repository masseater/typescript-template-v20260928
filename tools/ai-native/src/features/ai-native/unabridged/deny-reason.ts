import { Option } from "effect";

import { bashCommandOf, malformedBashInputReason } from "../bash-command.ts";
import { findSlicingCommands } from "./find-slicing-commands.ts";
import { denyReasonFor } from "./message.ts";

export const denyReasonOf = (toolName: string, toolInput: unknown): string | undefined => {
  if (toolName !== "Bash") return undefined;
  return Option.match(bashCommandOf(toolInput), {
    onNone: () => `unabridged: ${malformedBashInputReason}`,
    onSome: (command) => {
      const found = findSlicingCommands(command);
      return found.length === 0 ? undefined : denyReasonFor(found);
    },
  });
};
