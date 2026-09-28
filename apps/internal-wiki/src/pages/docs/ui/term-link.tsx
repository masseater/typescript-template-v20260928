"use client";

import { localState } from "@repo/ui";
import Link from "fumadocs-core/link";
import { useId } from "react";

import { findGlossaryTerm } from "#shared/glossary-term/index.ts";
import { useGlossaryTerms } from "./glossary-terms-provider.tsx";

import type { ReactElement } from "react";

const useOpen = localState(false);

function TermLink({ label, term }: Readonly<{ label?: string; term: string }>): ReactElement {
  const terms = useGlossaryTerms();
  const entry = findGlossaryTerm(terms, term);
  const text = label ?? term;
  const tooltipId = useId();
  const [open, setOpen] = useOpen();
  if (entry === undefined) {
    return (
      <span className="rounded-sm bg-muted px-1 text-muted-foreground" title="用語集にまだ無い用語">
        {text}
      </span>
    );
  }
  return (
    <span
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
      onFocus={() => {
        setOpen(true);
      }}
      onMouseEnter={() => {
        setOpen(true);
      }}
      onMouseLeave={() => {
        setOpen(false);
      }}
    >
      <Link
        href={entry.href}
        className="rounded-sm px-0.5 font-bold text-link underline decoration-dotted underline-offset-4 hover:text-link-hover"
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => {
          setOpen(false);
        }}
      >
        {text}
      </Link>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-20 mb-1.5 w-64 -translate-x-1/2 rounded-md border border-border bg-popover p-3 text-left text-sm text-popover-foreground shadow-md"
        >
          <span className="block font-bold text-foreground">{entry.name}</span>
          <span className="mt-1 block text-muted-foreground">{entry.description}</span>
          <span className="mt-2 block text-xs text-muted-foreground">{"用語のページを開く"}</span>
        </span>
      ) : undefined}
    </span>
  );
}

export { TermLink };
