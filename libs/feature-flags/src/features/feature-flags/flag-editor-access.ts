import { Context, type Effect } from "effect";

import type { FlagEditorRequired } from "./flag-editor-required.ts";

class FlagEditorAccess extends Context.Service<
  FlagEditorAccess,
  {
    readonly assertEditor: (
      user: Readonly<{ id: string; permission: string | null }>,
    ) => Effect.Effect<void, FlagEditorRequired>;
  }
>()("@repo/feature-flags/FlagEditorAccess") {}

export { FlagEditorAccess };
