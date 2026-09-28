import { telemetryAsked } from "./optional-setting.ts";
import { sdkFilePath } from "./sdk-file-path.ts";

const vitestOpenTelemetry = {
  enabled: telemetryAsked,
  sdkPath: sdkFilePath(import.meta.resolve("./vitest-sdk.ts")),
};

export { vitestOpenTelemetry };
