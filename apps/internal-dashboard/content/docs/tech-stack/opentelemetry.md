---
title: OpenTelemetry
description: 処理の区間を span にし、同じ trace id のログと一緒に OTLP で送る。HTTP を受けた span は自動で開く
---

OpenTelemetry は、トレース、メトリクス、ログを一つのモデルで表し、OTLP で送る。トレースは span の木で、一本の trace id を共有する。span は名前と、開始から終了までの区間と、親の span id を持つ。ログは別の信号で、同じ trace id を持てる。この送り出しはトレースとログで、どちらも OTLP の JSON である。

サーバーでは `effect/unstable/observability` の `OtlpTracer` と `OtlpLogger` が、`{endpoint}/v1/traces` と `{endpoint}/v1/logs` へ出す。リソースにはサービス名と版を載せる。タイマーでは送らない。`flushTelemetry` が溜めた分を送る。[Cloudflare](/tech-stack/cloudflare) では応答を返したあとに isolate が止まりうるので、応答を返せたときはその flush を `waitUntil` に渡す。エンドポイントが無いときは OTLP へ出さず、構造化ログの行だけが残る。

リクエストの区間は `observeRequest` が `http.server.request` という server span として開く。Worker の `fetch` は毎リクエストこれを通すので、ルートの関数は `http.server.request` を自分では開かない。来た `traceparent` が [W3C Trace Context](https://www.w3.org/TR/trace-context/) として読めるときは、その span を親にする。読めなければ新しい trace id を切る。子の区間は `withSpan` で切る。属性名が `authorization` や `token` に当たる値は、span に載せる前に `[redacted]` へ置き換わる。`Effect.withSpan` へ直接渡すと、この置換を通らない。

```ts title="libs/runtime/src/features/runtime/worker.ts"
    fetch: (httpRequest, _environment, runtimeContext): Promise<Response> =>
      Effect.runPromise(
        Effect.gen(function* serveFetch() {
          const exit = yield* Effect.promise(() =>
            asked.runtime.runPromiseExit(observeRequest(httpRequest, asked.route)),
          );
          if (exit._tag === "Success") {
            runtimeContext.waitUntil(asked.runtime.runPromise(flushTelemetry));
```

```ts title="apps/service-member/src/shared/billing/stripe.ts"
    withSpan("stripe.request", { attributes: { "stripe.path": path } }),
```

Worker の `fetch` は、ルートの処理 `asked.route` を `observeRequest` に包んで実行する。`http.server.request` が開き、ルートの処理はその中で実行される。来た `traceparent` が読めればその trace id を引き継ぎ、Stripe への要求のように `withSpan` で切った `stripe.request` はその子になる。応答の `traceparent` は同じ trace id と、この server span の span id を持つ。同じリクエストのログにもその trace id が付く。応答を返せたときは、溜めた分を送る `flushTelemetry` を `waitUntil` に渡す。

## 自動計装

自動計装は、呼び出し側が span を書かなくても、ライブラリの関数が span を開く。Node ではプロセスの起動時に `@opentelemetry/auto-instrumentations-node/register` を読み、`http` や `fetch` を包む。包む処理はアプリのモジュールより先に入る。後から読むと、既に束縛された関数は包まれない。

Workers は Node の起動フラグでモジュールを差し替えない。入ってくる HTTP の span は、Worker の `fetch` が `observeRequest` を通すことで開く。データベースのクエリや画面の処理は、`observeRequest` では開かない。区間が要るときは `withSpan` で切る。

ブラウザでは `globalThis.fetch` を差し替える。同じオリジンへの `fetch` は、呼び出し側がヘッダを書かなくても `traceparent` が付く。trace id と span id はその呼び出しで新しく切り、ページが既に持っている trace には繋がない。記録の名前は `http.client.request` で、OTLP には出さず `/api/telemetry` の JSON に載る。サーバーの `observeRequest` は、その `traceparent` を親にして同じ trace id を続ける。別オリジンと `/api/telemetry` 自身は差し替えない。

```ts title="libs/ui/src/features/ui/browser-telemetry/browser.ts"
const patchFetch = (instrumentation: FetchInstrumentation): (() => void) => {
  const originalFetch = globalThis.fetch;
  const instrumentedFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input);
    if (url.origin !== globalThis.location.origin || url.pathname === instrumentation.endpoint) {
      return instrumentation.send(input, init);
    }
    return tracedFetch(instrumentation, new Request(input instanceof Request ? input : url, init));
  };
  globalThis.fetch = instrumentedFetch;
```

同じオリジンの `fetch("/users/123")` は `tracedFetch` を通り、新しい trace id と span id の `traceparent` を付けて送る。別オリジンと、送り先のエンドポイント自身は `instrumentation.send` のままである。

## 採ると

| 見ているもの | 採る前 | 採ったあと |
| --- | --- | --- |
| Stripe への要求 | ログの行が、どのリクエストのものかをあとから繋げない | `http.server.request` が開き、`stripe.request` がその子になる。同じリクエストのログに同じ trace id が付く |
| 来た `traceparent` | サーバーが新しい trace id を切る | ヘッダが読めるときは、その span を親にする。読めなければ新しい trace id を切る |
| ブラウザの `fetch("/users/123")` | `traceparent` は呼び出し側がヘッダに書く | 同じオリジンなら `tracedFetch` が新しい id を付ける。サーバーの `observeRequest` がその trace id を続ける |

## 参考文献

- 公式 — [OpenTelemetry](https://opentelemetry.io/docs/what-is-opentelemetry/)
- 公式 — [Signals](https://opentelemetry.io/docs/concepts/signals/)
- 公式 — [Traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- 公式 — [Logs](https://opentelemetry.io/docs/concepts/signals/logs/)
- 公式 — [Metrics](https://opentelemetry.io/docs/concepts/signals/metrics/)
- 公式 — [Context propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
- 公式 — [OTLP](https://opentelemetry.io/docs/specs/otlp/)
- 公式 — [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- 公式 — [JavaScript](https://opentelemetry.io/docs/languages/js/)
- 公式 — [Instrumentation](https://opentelemetry.io/docs/concepts/instrumentation/)
- 公式 — [Using instrumentation libraries](https://opentelemetry.io/docs/languages/js/libraries/)
- 公式 — [JavaScript zero-code instrumentation](https://opentelemetry.io/docs/zero-code/js/)
- 公式 — [Effect · Tracing](https://effect.website/docs/v4/observability/tracing/)
- 公式 — [Exporting OpenTelemetry data](https://developers.cloudflare.com/workers/observability/exporting-opentelemetry-data/)
- サンプル — [open-telemetry/opentelemetry-js](https://github.com/open-telemetry/opentelemetry-js)
- サンプル — [auto-instrumentations-node](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/auto-instrumentations-node)
- サンプル — [open-telemetry/opentelemetry-demo](https://github.com/open-telemetry/opentelemetry-demo)
- 記事 — [How to name your spans](https://opentelemetry.io/blog/2025/how-to-name-your-spans/)
- 記事 — [How to name your span attributes](https://opentelemetry.io/blog/2025/how-to-name-your-span-attributes/)
