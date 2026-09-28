import { cva } from "class-variance-authority";

import type { ReactElement } from "react";

const countBadgeVariants = cva(
  "inline-flex min-w-5 items-center justify-center rounded-full bg-secondary text-sm leading-none font-bold text-secondary-foreground",
  {
    defaultVariants: { placement: "inline" },
    variants: {
      placement: { corner: "absolute -top-1 -right-2 px-1", inline: "px-2 py-0.5" },
    },
  },
);

const CountBadge = ({
  count,
  label,
  placement,
}: Readonly<{
  count: number;
  label?: string;
  placement?: "corner" | "inline";
}>): ReactElement | null => {
  if (count === 0) {
    return null;
  }
  if (label === undefined) {
    return (
      <span data-slot="count-badge" className={countBadgeVariants({ placement })}>
        {count}
      </span>
    );
  }
  return (
    <span data-slot="count-badge" className={countBadgeVariants({ placement })}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">{count}</span>
    </span>
  );
};

export { CountBadge };
