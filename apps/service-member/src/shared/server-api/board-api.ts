import { verifySession } from "@repo/auth";
import { httpStatus } from "@repo/config";
import { sessionFailures } from "@repo/runtime/account";
import { createApi, readJsonBody, readSearchParams } from "@repo/runtime/http";
import { Effect } from "effect";

import {
  BoardPostCreate,
  BoardPostCreated,
  BoardThreadCreate,
  BoardThreadCreated,
  BoardThreadList,
  BoardThreadListQuery,
  BoardThreadQuery,
  BoardThreadView,
  boardPostPageSize,
  boardThreadPageSize,
} from "#shared/contracts/index.ts";
import { createBoardPost, createBoardThread, findBoardThread, listBoardThreads } from "./board.ts";

import type { AppServices } from "@repo/runtime";
import type { ApiRoutes } from "@repo/runtime/http";

const failures = {
  ...sessionFailures,
  BoardMemberRequired: { message: "掲示板は会員だけが使えます。", status: httpStatus.forbidden },
  BoardThreadNotFound: { message: "スレッドが見つかりません。", status: httpStatus.notFound },
};

function boardApi(api: ApiRoutes<AppServices>) {
  return createApi("/board")
    .get(
      "/threads",
      ...api.route({ failures, response: BoardThreadList }, (request) =>
        Effect.gen(function* handle() {
          const { user } = yield* verifySession(request.headers);
          const { page } = yield* readSearchParams(BoardThreadListQuery, request);
          const list = yield* listBoardThreads(user.id, {
            limit: boardThreadPageSize,
            offset: (page - 1) * boardThreadPageSize,
          });
          return { ...list, pageSize: boardThreadPageSize };
        }),
      ),
    )
    .post(
      "/threads",
      ...api.route({ failures, response: BoardThreadCreated }, (request) =>
        Effect.gen(function* handle() {
          const { user } = yield* verifySession(request.headers);
          const draft = yield* readJsonBody(BoardThreadCreate, request);
          return { id: yield* createBoardThread(user.id, draft) };
        }),
      ),
    )
    .get(
      "/thread",
      ...api.route({ failures, response: BoardThreadView }, (request) =>
        Effect.gen(function* handle() {
          const { user } = yield* verifySession(request.headers);
          const { id, page } = yield* readSearchParams(BoardThreadQuery, request);
          const found = yield* findBoardThread(user.id, id, {
            limit: boardPostPageSize,
            offset: (page - 1) * boardPostPageSize,
          });
          return { ...found, pageSize: boardPostPageSize };
        }),
      ),
    )
    .post(
      "/posts",
      ...api.route({ failures, response: BoardPostCreated }, (request) =>
        Effect.gen(function* handle() {
          const { user } = yield* verifySession(request.headers);
          const { body, threadId } = yield* readJsonBody(BoardPostCreate, request);
          return { id: yield* createBoardPost(user.id, threadId, body) };
        }),
      ),
    );
}

export { boardApi };
