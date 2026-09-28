import { Outlet } from "@tanstack/react-router";

import { WikiFrame } from "./wiki-frame.tsx";

import type { ReactElement } from "react";

function WikiLayout(): ReactElement {
  return (
    <WikiFrame>
      <Outlet />
    </WikiFrame>
  );
}

export { WikiLayout };
