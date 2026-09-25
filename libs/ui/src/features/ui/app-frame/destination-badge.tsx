import type { ReactElement } from "react";
import type { DestinationBadgeValue } from "./types.ts";

const failedBadgeMark = "!";
const failedBadgeText = "件数を取得できませんでした";

const DestinationBadge = ({
  badge,
  compact,
}: Readonly<{
  badge: DestinationBadgeValue | undefined;
  compact: boolean;
}>): ReactElement | null => {
  if (badge === undefined || badge === 0) {
    return null;
  }
  const placement = compact ? "absolute -top-1 -right-2 px-1" : "px-2 py-0.5";
  return (
    <span
      className={`${placement} rounded-full bg-secondary text-sm leading-none font-bold text-secondary-foreground`}
    >
      {badge === "failed" ? (
        <>
          <span aria-hidden>{failedBadgeMark}</span>
          <span className="sr-only">{failedBadgeText}</span>
        </>
      ) : (
        badge
      )}
    </span>
  );
};

export { DestinationBadge };
