import { useAtom } from "@effect/atom-react";
import { useNavigate } from "@tanstack/react-router";
import { Atom } from "effect/unstable/reactivity";

import { filterOf, normalizeAuditSearch, searchOf } from "./audit-search.ts";

import type { AuditFilter, AuditFilterForm } from "./audit-filter.ts";
import type { AuditSearch } from "./audit-search.ts";

const draftAtom = Atom.family((applied: string) =>
  Atom.make<AuditFilter>(filterOf(normalizeAuditSearch(JSON.parse(applied)))),
);

function useAuditFilter(search: AuditSearch): AuditFilterForm {
  const navigate = useNavigate();
  const applied = searchOf(filterOf(search));
  const [draft, setDraft] = useAtom(draftAtom(JSON.stringify(applied)));
  function handleSubmit(event: Readonly<{ preventDefault: () => void }>): void {
    event.preventDefault();
    void navigate({ search: searchOf(draft), to: "/audit" });
  }
  return {
    ...draft,
    handleActionChange: (action) => {
      setDraft({ ...draft, action });
    },
    handleActorIdChange: (actorId) => {
      setDraft({ ...draft, actorId });
    },
    handleSubmit,
    handleTargetIdChange: (targetId) => {
      setDraft({ ...draft, targetId });
    },
  };
}

export { useAuditFilter };
