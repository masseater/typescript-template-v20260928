import { DateTime, Effect } from "effect";
import { noop } from "es-toolkit";
import { expect, userEvent } from "storybook/test";

import preview, { playTask } from "../../../storybook/preview";
import { InvitationBoard } from "./invitation-board";
import { InvitationForm } from "./invitation-form";

const permissions = ["admin", "viewer"] as const;

type Permission = (typeof permissions)[number];

const isPermission = (candidate: string): candidate is Permission =>
  permissions.some((permission) => permission === candidate);

const invite = (email: string): Promise<{ email: string; expiresAt: Date }> =>
  Promise.resolve({ email, expiresAt: DateTime.toDate(DateTime.makeUnsafe(0)) });

const meta = preview.meta({
  args: {
    children: <p>{"招待中の相手はいません。"}</p>,
    form: (
      <InvitationForm
        defaultPermission="viewer"
        invite={invite}
        isPermission={isPermission}
        label="招待のフォーム"
        onInvited={noop}
        permissionOptions={[
          { label: "管理者", value: "admin" },
          { label: "閲覧者", value: "viewer" },
        ]}
      />
    ),
  },
  component: InvitationBoard,
});

export const Opened = meta.story({
  play: ({ canvas, canvasElement }) =>
    Effect.runPromise(
      Effect.gen(function* openInvitationForm() {
        yield* playTask(() => userEvent.click(canvas.getByRole("button", { name: "招待する" })));
        const form = yield* playTask(() => canvas.findByRole("form", { name: "招待のフォーム" }));
        yield* playTask(() => expect(form).toBeInTheDocument());
        const primaries = canvasElement.querySelectorAll('[data-variant="primary"]');
        yield* playTask(() => expect(primaries).toHaveLength(1));
        yield* playTask(() => expect(primaries[0]).toHaveTextContent("招待メールを送る"));
      }),
    ),
});
