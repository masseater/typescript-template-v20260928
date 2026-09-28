import { Option, Schema } from "effect";

const BashToolInput = Schema.Struct({ command: Schema.String });

export const malformedBashInputReason =
  "The Bash tool input has no string `command`, so the command line cannot be checked. Pass the command line as a string in `command`.";

export const bashCommandOf = (toolInput: unknown): Option.Option<string> =>
  Option.map(Schema.decodeUnknownOption(BashToolInput)(toolInput), (decoded) => decoded.command);
