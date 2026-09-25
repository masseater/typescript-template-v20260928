import { errorMessage } from "@repo/auth-ui";
import { apiData } from "@repo/runtime/client";
import { queryOptions } from "@tanstack/react-query";

import { adminClient } from "#shared/api/index.ts";
import {
  AgreementPublished,
  AgreementVersionDetail,
  AgreementVersionList,
  AgreementVersionSaved,
} from "#shared/contracts/index.ts";

import type { AgreementDraft, AgreementDraftRevision } from "#shared/contracts/index.ts";

type VersionList = typeof AgreementVersionList.Type;
type VersionDetail = typeof AgreementVersionDetail.Type;

function fetchVersions(): Promise<VersionList> {
  return adminClient()
    .agreements.get()
    .then((response) => apiData(AgreementVersionList, response))
    .catch((failure: unknown) => {
      throw new Error(errorMessage(failure));
    });
}

function fetchVersion(version: string): Promise<VersionDetail> {
  return adminClient()
    .agreements.version.get({ query: { version } })
    .then((response) => apiData(AgreementVersionDetail, response))
    .catch((failure: unknown) => {
      throw new Error(errorMessage(failure));
    });
}

function createDraft(
  draft: typeof AgreementDraft.Type,
): Promise<typeof AgreementVersionSaved.Type> {
  return adminClient()
    .agreements.post(draft)
    .then((response) => apiData(AgreementVersionSaved, response));
}

function reviseDraft(
  revision: typeof AgreementDraftRevision.Type,
): Promise<typeof AgreementVersionSaved.Type> {
  return adminClient()
    .agreements.patch(revision)
    .then((response) => apiData(AgreementVersionSaved, response));
}

function publishVersion(id: string): Promise<typeof AgreementPublished.Type> {
  return adminClient()
    .agreements.publish.post({ id })
    .then((response) => apiData(AgreementPublished, response));
}

const agreementVersionsKey = ["admin-agreement-versions"] as const;

const versionListOptions = queryOptions({
  queryFn: fetchVersions,
  queryKey: [...agreementVersionsKey, "list"] as const,
  retry: false,
});

function versionDetailOptions(version: string) {
  return queryOptions({
    queryFn: () => fetchVersion(version),
    queryKey: [...agreementVersionsKey, "version", version] as const,
    retry: false,
  });
}

export {
  agreementVersionsKey,
  createDraft,
  publishVersion,
  reviseDraft,
  versionDetailOptions,
  versionListOptions,
};
export type { VersionDetail, VersionList };
