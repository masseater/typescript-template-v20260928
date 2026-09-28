---
title: OpenTelemetry Collector
description: OTLP を受け、加工し、別の送り先へ出すプロセス
---

OpenTelemetry Collector は、OTLP を受け、加工し、別の送り先へ出すプロセスである。受ける側が receiver、加工が processor、出口が exporter で、service の pipeline が三つを信号ごとに繋ぐ。

processor の `batch` は一件ずつ送らず、溜めてから exporter を呼ぶ。traces と metrics と logs は pipeline を分けられる。

終わった trace を見てから残すのが tail sampling である。span を開くときに決める head sampling では、遅かった trace を選べない。`decision_wait` のあいだ span を溜め、方針に合うものだけを exporter へ出す。

方針には、所要時間のしきい値や、status が `ERROR` であることを書く。

このテンプレートは Collector を持たない。手元の受け口は `infra/local/compose.yaml` のコンテナで、デプロイ先の Worker は Workers Observability と設定した OTLP の送り先へ直接出す。

## 参考文献

- 公式 — [Collector](https://opentelemetry.io/docs/collector/)
- 公式 — [Configuration](https://opentelemetry.io/docs/collector/configuration/)
- 公式 — [Installation](https://opentelemetry.io/docs/collector/installation/)
- サンプル — [open-telemetry/opentelemetry-collector](https://github.com/open-telemetry/opentelemetry-collector)
- サンプル — [tailsamplingprocessor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor)
