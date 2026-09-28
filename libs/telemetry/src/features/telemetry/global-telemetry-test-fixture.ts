import {
  context,
  metrics,
  propagation,
  trace,
  type ContextManager,
  type MeterProvider,
  type TextMapPropagator,
  type TracerProvider,
} from "@opentelemetry/api";
import { logs, type LoggerProvider } from "@opentelemetry/api-logs";

type RegisteredApis = {
  context?: ContextManager;
  propagation?: TextMapPropagator;
  trace?: TracerProvider;
  metrics?: MeterProvider;
};

type LoggerProviderGetter = (version: number) => LoggerProvider;

type GlobalTelemetry = {
  readonly apis: Readonly<RegisteredApis>;
  readonly loggerProviderGetter: LoggerProviderGetter | undefined;
  readonly exitListeners: readonly NodeJS.BeforeExitListener[];
};

const API_REGISTRY = Symbol.for("opentelemetry.js.api.1");

const LOGS_REGISTRY = Symbol.for("io.opentelemetry.js.api.logs");

const registeredApis = (): RegisteredApis | undefined => Reflect.get(globalThis, API_REGISTRY);

const heldGlobalTelemetry = (): GlobalTelemetry => {
  const apis = registeredApis();
  return {
    apis: {
      context: apis?.context,
      propagation: apis?.propagation,
      trace: apis?.trace,
      metrics: apis?.metrics,
    },
    loggerProviderGetter: Reflect.get(globalThis, LOGS_REGISTRY),
    exitListeners: process.listeners("beforeExit"),
  };
};

const unregisterGlobalTelemetry = (): void => {
  for (const listener of process.listeners("beforeExit")) {
    process.off("beforeExit", listener);
  }
  context.disable();
  propagation.disable();
  trace.disable();
  metrics.disable();
  logs.disable();
};

const reinstateGlobalTelemetry = (held: GlobalTelemetry): void => {
  const apis = registeredApis();
  if (apis !== undefined) {
    for (const [kind, registered] of Object.entries(held.apis)) {
      if (registered !== undefined) {
        Reflect.set(apis, kind, registered);
      }
    }
  }
  held.apis.context?.enable();
  if (held.loggerProviderGetter !== undefined) {
    Reflect.set(globalThis, LOGS_REGISTRY, held.loggerProviderGetter);
  }
  for (const listener of held.exitListeners) {
    process.on("beforeExit", listener);
  }
};

export const setAsideGlobalTelemetry = (): (() => void) => {
  const held = heldGlobalTelemetry();
  unregisterGlobalTelemetry();
  return () => {
    unregisterGlobalTelemetry();
    reinstateGlobalTelemetry(held);
  };
};
