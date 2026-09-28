import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  agreementVersionsKey,
  versionDetailOptions,
  versionListOptions,
} from "#pages/terms/api/agreement-versions.ts";

import type { VersionDetail, VersionList } from "#pages/terms/api/agreement-versions.ts";
import type { FetchedValue } from "@repo/ui";

interface Loaded<Value> {
  readonly reload: () => void;
  readonly state: FetchedValue<Value>;
}

function useReloadVersions(): () => void {
  const queries = useQueryClient();
  return () => {
    void queries.invalidateQueries({ queryKey: agreementVersionsKey });
  };
}

function useAgreementVersions(): Loaded<VersionList> {
  return { reload: useReloadVersions(), state: useQuery(versionListOptions) };
}

function useAgreementVersion(version: string): Loaded<VersionDetail> {
  return { reload: useReloadVersions(), state: useQuery(versionDetailOptions(version)) };
}

export { useAgreementVersion, useAgreementVersions };
export type { VersionDetail, VersionList };
