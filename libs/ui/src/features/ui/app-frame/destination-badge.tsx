import { CountBadge } from "../shared/ui/count-badge.tsx";

import type { ReactElement } from "react";

const DestinationBadge = ({
  badge,
  compact,
}: Readonly<{ badge: number | undefined; compact: boolean }>): ReactElement | null => {
  if (badge === undefined) {
    return null;
  }
  return <CountBadge count={badge} placement={compact ? "corner" : "inline"} />;
};

export { DestinationBadge };
