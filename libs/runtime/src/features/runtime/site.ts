import { Telemetry, type TelemetryInvalid } from "@repo/observability";
import type { OtlpExporter } from "effect/unstable/observability";
import { Layer } from "effect";

import { Assets } from "./assets.ts";

import type { SiteConfig } from "@repo/config";

type SiteServices = Assets | Telemetry | OtlpExporter.Flusher;

const configuredSiteLayer = (
  asked: Readonly<{
    readonly siteConfig: SiteConfig;
    readonly serviceName: string;
    readonly routes: Readonly<Record<string, string>>;
  }>,
): Layer.Layer<SiteServices, TelemetryInvalid> => {
  const otlp =
    asked.siteConfig.OTLP_ENDPOINT === undefined
      ? undefined
      : {
          authorization: asked.siteConfig.OTLP_AUTHORIZATION,
          endpoint: asked.siteConfig.OTLP_ENDPOINT,
        };
  const telemetry = Telemetry.layer({
    otlp,
    release: asked.siteConfig.APP_RELEASE,
    routes: asked.routes,
    serviceName: asked.serviceName,
  });
  return Layer.succeed(Assets, asked.siteConfig.ASSETS).pipe(Layer.provideMerge(telemetry));
};

export { configuredSiteLayer };
export type { SiteServices };
