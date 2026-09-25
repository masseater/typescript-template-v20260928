import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { apiData } from "@repo/runtime/client";
import { requestAtom, type RequestResult } from "@repo/ui";
import { Atom } from "effect/unstable/reactivity";

import { adminClient } from "#shared/api/index.ts";
import { AgreementVersionDetail, AgreementVersionList } from "#shared/contracts/index.ts";

type VersionList = typeof AgreementVersionList.Type;
type VersionDetail = typeof AgreementVersionDetail.Type;

interface Loaded<Value> {
  readonly reload: () => void;
  readonly state: RequestResult<Value>;
}

function fetchVersions(): Promise<VersionList> {
  return adminClient()
    .agreements.get()
    .then((response) => apiData(AgreementVersionList, response));
}

function fetchVersion(version: string): Promise<VersionDetail> {
  return adminClient()
    .agreements.version.get({ query: { version } })
    .then((response) => apiData(AgreementVersionDetail, response));
}

const versionListAtom = requestAtom(fetchVersions);

const versionDetailAtom = Atom.family((version: string) =>
  requestAtom(() => fetchVersion(version)),
);

function useAgreementVersions(): Loaded<VersionList> {
  return { reload: useAtomRefresh(versionListAtom), state: useAtomValue(versionListAtom) };
}

function useAgreementVersion(version: string): Loaded<VersionDetail> {
  const atom = versionDetailAtom(version);
  return { reload: useAtomRefresh(atom), state: useAtomValue(atom) };
}

export { useAgreementVersion, useAgreementVersions };
export type { VersionDetail, VersionList };
