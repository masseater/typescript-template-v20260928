import type { ReactElement } from "react";
import type { Children } from "./types";

const Table = ({ children, label }: Children & Readonly<{ label?: string }>): ReactElement => {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        aria-label={label}
        data-slot="table"
        className="w-full caption-bottom border-collapse border border-border bg-card text-base"
      >
        {children}
      </table>
    </div>
  );
};

export { Table };
