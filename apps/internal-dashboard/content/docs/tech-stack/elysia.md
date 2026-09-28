---
title: Elysia
description: URL を持つ HTTP API のルーター。ハンドラは Effect で、呼び出し側の型は Eden Treaty が出す
---

Elysia は HTTP のルーターである。URL とメソッドをインスタンスに登録し、来た `Request` は `app.fetch` が受ける。[TanStack Start](/tech-stack/tanstack-start) の `createServerFn` は URL を持たない。URL として置く API は Elysia に置き、Workers の fetch 自体は Start が受ける。`/api/$` のサーバールートが、受け取った `Request` を渡す。

```ts title="apps/service-member/src/app/routes/api.$.ts"
const Route = createFileRoute("/api/$")({ server: elysiaServer(userApi) });
```

`ANY` は `app.fetch` を呼ぶ。`HEAD` は、応答が `text/event-stream` のとき本体を読まず、それ以外では `content-length` を付けてヘッダだけ返す。

インスタンスは `createApi(prefix)` が作る。Workers 向けに `CloudflareAdapter` を付ける。一致する URL が無いときは 404 で、本体は `{ error }` である。

処理は Effect として `api.route` に渡す。`api.route` は実行時に Effect を実行する登録口で、`body` のスキーマで JSON をデコードしてから処理に渡し、成功の値を `response` のスキーマで符号化し、タグ付きの失敗を第三引数の表にあるステータスにする。JSON がスキーマを満たさないときの `InputInvalid` や、セッション不足のような共通の失敗は、この表には書かない。

```ts title="apps/service-member/src/shared/server-api/contact-api.ts"
const failures = {
  RateLimitExceeded: {
    message: "送信回数の上限に達しました。しばらく待ってから再度お試しください。",
    status: httpStatus.tooManyRequests,
  },
};
const submitContact = Effect.fn("contact.submit")(function* submitContact(
  request: Request,
  submission: typeof ContactSubmission.Type,
) {
  return { ok: true as const };
});
function contactApi(api: ApiRoutes<AppServices | OpsMail>) {
  return createApi("").post(
    "/contact",
    ...api.route({ body: ContactSubmission, response: ContactAccepted }, submitContact, failures),
  );
}
```

`submitContact(request, submission)` は Effect を返すだけで、この時点では送信回数の確認もメールの送信も起きない。`POST /api/contact` を受けた `api.route` がそれを実行する。スキーマを満たさない JSON は `InputInvalid` になり、送信回数の上限を超えると表の `RateLimitExceeded` として 429 になる。通った `{ ok: true }` は `ContactAccepted` で符号化してから返す。

URL をファイルで分けるときは、子を `createApi("")` で作り、プレフィックス `/api` の親が `.use` する。子には `/api` を書かない。上の `contactApi` を親が `.use` した URL は `POST /api/contact` になる。

クライアントの型は、登録した `app` から Eden Treaty が作る。サーバーの `apiServerClient` は `treaty(app)` で、HTTP を出さずにそのインスタンスを呼ぶ。ブラウザの `apiClient` は `treaty<App>(location.origin)` で、同じ URL を HTTP で呼ぶ。どちらも `parseDate: false` で、日付の文字列を `Date` にしない。ブラウザの fetch は `credentials: "same-origin"`、`cache: "no-store"` である。

```ts title="apps/service-member/src/entities/profile/api/profile.ts"
function saveProfile(draft: ProfileDraft): Promise<Profile> {
  return Promise.resolve(userClient()).then(({ api }) =>
    api.profile.patch(draft).then((response) => apiData(ProfileView, response)),
  );
}
```

`api` はプレフィックス `/api`、`profile` は URL `/profile` である。`patch` の引数が JSON になる。成功は `response.data`、失敗は `response.error` に入り、本体を Schema で読むときは `apiData` に渡す。画面のコードをサーバーとブラウザで一つの関数にするときは `createIsomorphicFn` で分け、server 側は受信した cookie を `apiServerClient` に渡し、client 側は `apiClient` を返す。`userClient` がその分けた関数である。

## 採ると

| 見ているもの | 採る前 | 採ったあと |
| --- | --- | --- |
| 問い合わせの送信 | `createServerFn` には URL が無いので、ブラウザ以外はこの関数を HTTP で呼べない | `POST /api/contact` が `app.fetch` に届き、`api.route` が `submitContact` を実行する |
| 送信回数の上限を超えた | ハンドラがその場で status を決める | `RateLimitExceeded` が表の 429 になる。スキーマを満たさない JSON は `InputInvalid` で、この表には書かない |
| `api.profile.patch` | URL と JSON の形を、サーバーとは別の型に書く | 引数と `response.data` は登録した `app` から出る。サーバーは `treaty(app)`、ブラウザは `treaty<App>(location.origin)` で同じ URL を呼ぶ |

## 参考文献

- 公式 — [Elysia](https://elysiajs.com/)
- 公式 — [Route](https://elysiajs.com/essential/route.html)
- 公式 — [Eden](https://elysiajs.com/eden/overview.html)
- 公式 — [Treaty](https://elysiajs.com/eden/treaty/overview.html)
- 公式 — [Cloudflare Worker](https://elysiajs.com/integrations/cloudflare-worker.html)
- 公式 — [At a glance](https://elysiajs.com/at-glance)
- サンプル — [elysiajs/elysia](https://github.com/elysiajs/elysia)
- 記事 — [Elysia 1.0](https://elysiajs.com/blog/elysia-10)
- 記事 — [Elysia 1.2](https://elysiajs.com/blog/elysia-12)
