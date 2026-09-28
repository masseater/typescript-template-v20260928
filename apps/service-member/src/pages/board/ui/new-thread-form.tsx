import {
  Button,
  ButtonLink,
  Field,
  FormColumn,
  Heading,
  STATUS_VARIANT,
  StatusMessage,
  useToast,
} from "@repo/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Effect } from "effect";

import { boardKey } from "#pages/board/api/board.ts";
import { useNewThreadForm } from "#pages/board/model/new-thread-form.ts";
import { maximumBoardBodyLength, maximumBoardTitleLength } from "#shared/contracts/index.ts";

import type { ReactElement } from "react";

function showCreated(
  threadId: string,
  invalidate: () => Promise<unknown>,
  goToThread: (threadId: string) => Promise<unknown>,
  notify: (kind: "success", message: string) => void,
): Promise<void> {
  return Effect.runPromise(
    Effect.gen(function* afterCreate() {
      yield* Effect.promise(() => invalidate());
      yield* Effect.promise(() => goToThread(threadId));
      notify("success", "スレッドを立てました。");
    }),
  );
}

function NewThreadForm(): ReactElement {
  const navigate = useNavigate();
  const queries = useQueryClient();
  const notify = useToast();
  const form = useNewThreadForm((threadId) =>
    showCreated(
      threadId,
      () => queries.invalidateQueries({ queryKey: boardKey }),
      (id) => navigate({ params: { id }, to: "/board/$id" }),
      notify,
    ),
  );
  return (
    <section aria-labelledby="new-thread-heading" className="flex flex-col gap-4">
      <Heading as="h2" size="section">
        <span id="new-thread-heading">スレッドを立てる</span>
      </Heading>
      <form onSubmit={form.handleSubmit} aria-busy={form.pending}>
        <FormColumn>
          <Field
            label="題"
            name="title"
            maxLength={maximumBoardTitleLength}
            value={form.title}
            onValueChange={form.handleTitleChange}
          />
          <Field
            multiline
            label="本文"
            name="body"
            maxLength={maximumBoardBodyLength}
            value={form.body}
            onValueChange={form.handleBodyChange}
          />
          <p className="text-sm leading-normal text-muted-foreground">
            残り {maximumBoardBodyLength - form.body.length} 文字
          </p>
          <div className="flex items-center gap-4">
            <Button type="submit" variant="primary" disabled={form.blocked}>
              投稿する
            </Button>
            <ButtonLink to="/board" search={{}}>
              やめる
            </ButtonLink>
          </div>
          {form.error !== undefined && (
            <StatusMessage variant={STATUS_VARIANT.failure}>{form.error}</StatusMessage>
          )}
        </FormColumn>
      </form>
    </section>
  );
}

export { NewThreadForm };
