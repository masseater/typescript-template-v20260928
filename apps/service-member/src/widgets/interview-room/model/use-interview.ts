import { type ActionState, localState, useAction } from "@repo/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { spoken } from "#shared/interview/index.ts";
import {
  interviewOptions,
  respondHistoryConsent,
  restartInterviewSession,
  saveInterviewSheet,
  submitTurn,
} from "../api/interview.ts";

import type { InterviewViewData, MemberUtterance } from "../api/interview.ts";

interface InterviewSession {
  readonly busy: boolean;
  readonly consent: (accept: boolean) => void;
  readonly failure: string | undefined;
  readonly heard: string | undefined;
  readonly loadError: string | undefined;
  readonly pending: boolean;
  readonly reload: () => void;
  readonly restart: () => void;
  readonly retry: () => void;
  readonly save: () => void;
  readonly say: (utterance: MemberUtterance) => void;
  readonly turnFailed: boolean;
  readonly typing: boolean;
  readonly view: InterviewViewData | undefined;
}

const useFailedTurn = localState<MemberUtterance | undefined>(undefined);

function firstError(actions: readonly ActionState[]): string | undefined {
  return actions.find((action) => action.error !== undefined)?.error;
}

function heardTurn(failedTurn: MemberUtterance | undefined): string | undefined {
  return failedTurn === undefined ? undefined : spoken(failedTurn);
}

function useInterview(onSaved?: () => Promise<void>): InterviewSession {
  const loaded = useQuery(interviewOptions);
  const queries = useQueryClient();
  const [failedTurn, setFailedTurn] = useFailedTurn();
  const turnAction = useAction();
  const saveAction = useAction();
  const restartAction = useAction();
  const consentAction = useAction();
  const actions = [turnAction, saveAction, restartAction, consentAction];
  const refresh = (): Promise<void> =>
    queries.invalidateQueries({ queryKey: interviewOptions.queryKey });
  function reload(): void {
    void queries.invalidateQueries({ queryKey: interviewOptions.queryKey });
  }
  const published = (): Promise<void> => {
    setFailedTurn(undefined);
    return refresh();
  };
  const afterSave = (next: InterviewViewData): Promise<void> =>
    published().then(() => (next.phase === "saved" ? onSaved?.() : undefined));
  const say = (utterance: MemberUtterance): void => {
    setFailedTurn(utterance);
    turnAction.run(() => submitTurn(utterance).then(published));
  };
  return {
    busy: actions.some((action) => action.pending),
    consent: (accept: boolean) => {
      consentAction.run(() => respondHistoryConsent(accept).then(afterSave));
    },
    failure: firstError(actions),
    heard: heardTurn(failedTurn),
    loadError: loaded.error?.message,
    pending: loaded.isFetching,
    reload,
    restart: () => {
      restartAction.run(() => restartInterviewSession().then(published));
    },
    retry: () => {
      if (failedTurn !== undefined) {
        say(failedTurn);
      }
    },
    save: () => {
      saveAction.run(() => saveInterviewSheet().then(afterSave));
    },
    say,
    turnFailed: turnAction.error !== undefined,
    typing: turnAction.pending,
    view: loaded.data,
  };
}

export { useInterview };
export type { InterviewSession };
