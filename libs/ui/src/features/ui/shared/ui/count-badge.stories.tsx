import preview from "../../../../../storybook/preview";
import { CountBadge } from "./count-badge";

import type { ReactElement } from "react";

const meta = preview.meta({ args: { count: 3 }, component: CountBadge });

export const Inline = meta.story();

export const Labelled = meta.story({ args: { label: "未読 3 件" } });

export const Corner = meta.story({
  args: { placement: "corner" },
  decorators: [
    (Story): ReactElement => (
      <span className="relative inline-block p-2">
        <Story />
      </span>
    ),
  ],
});
