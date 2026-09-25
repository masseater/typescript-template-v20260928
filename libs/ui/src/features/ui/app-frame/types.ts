import type { ReactElement } from "react";

type DestinationBadgeValue = number | "failed";

type AppFrameDestination = Readonly<{
  badge?: DestinationBadgeValue;
  exact?: boolean;
  icon: ReactElement;
  label: string;
  marker?: string;
  to: string;
}>;

type AppFrameSection = Readonly<{
  destinations: readonly AppFrameDestination[];
  label: string;
}>;

export type { AppFrameDestination, AppFrameSection, DestinationBadgeValue };
