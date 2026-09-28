---
title: Observability
description: ブラウザと Worker の信号が送り先に届くまでの経路と、それを読むための仕組み
---

```mermaid
flowchart TD
  browser["ブラウザ（libs/ui の browser-telemetry）"]
  worker["Worker（libs/observability）"]
  local["手元の受け口（infra/local の otlp コンテナ）"]
  workers["Workers Observability"]
  endpoint["設定した OTLP の送り先"]
  browser -- "/api/telemetry" --> worker
  worker -- "OTLP（手元）" --> local
  worker -- "ログとトレース（デプロイ先）" --> workers
  worker -- "OTLP（デプロイ先）" --> endpoint
```

## ページ

- [Browser](/observability/browser) — 利用者の時計と、ページが持つ計時
- [Web Performance API](/observability/web-performance-api) — LCP、INP、Resource Timing
- [HTTP](/observability/http) — 要求と応答、`Server-Timing`
- [W3C Trace Context](/observability/trace-context) — `traceparent`
- [OpenTelemetry SDK](/observability/opentelemetry-sdk) — `startSpan`、Semantic Conventions、sampling
- [OTLP](/observability/otlp) — `/v1/traces` への POST
- [OpenTelemetry Collector](/observability/collector) — receiver、tail sampling
- [Prometheus](/observability/prometheus) — p99、Histogram、ラベルの cardinality
- [Exemplars](/observability/exemplars) — メトリクスの一点から trace id へ
- [Tracing / Logging / Profiling](/observability/signals) — 同じ trace id、flame graph
- [SLI / SLO](/observability/sli-slo) — RED、USE、誤り予算、burn rate
