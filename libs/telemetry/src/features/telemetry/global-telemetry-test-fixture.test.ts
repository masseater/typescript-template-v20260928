import { context, metrics, ROOT_CONTEXT, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { LoggerProvider } from "@opentelemetry/sdk-logs";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
import { TracerProvider } from "@opentelemetry/sdk-trace";
import { describe, expect, test } from "vite-plus/test";

import { setAsideGlobalTelemetry } from "./global-telemetry-test-fixture.ts";

const PROBE_KEY = Symbol.for("global-telemetry-probe");

describe("setAsideGlobalTelemetry", () => {
  const registered = test.extend("registeredBeforeTheTest", ({}, { onCleanup }) => {
    onCleanup(setAsideGlobalTelemetry());
    const exitListener = (): void => undefined;
    process.on("beforeExit", exitListener);
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
    trace.setGlobalTracerProvider(new TracerProvider());
    metrics.setGlobalMeterProvider(new MeterProvider());
    logs.setGlobalLoggerProvider(new LoggerProvider());
    return {
      exitListeners: process.listeners("beforeExit"),
      tracerProvider: trace.getTracerProvider(),
      meterProvider: metrics.getMeterProvider(),
      loggerProvider: logs.getLoggerProvider(),
    };
  });

  describe("while a test has them set aside", () => {
    const it = registered.extend("theGlobalsWhileSetAside", ({}, { onCleanup }) => {
      onCleanup(setAsideGlobalTelemetry());
      return {
        exitListeners: process.listeners("beforeExit"),
        meterProvider: metrics.getMeterProvider(),
        loggerProvider: logs.getLoggerProvider(),
      };
    });

    it("leaves no beforeExit listener for the test to fire", ({ theGlobalsWhileSetAside }) => {
      expect(theGlobalsWhileSetAside.exitListeners).toStrictEqual([]);
    });

    it("leaves the meter provider unregistered", ({
      registeredBeforeTheTest,
      theGlobalsWhileSetAside,
    }) => {
      expect(theGlobalsWhileSetAside.meterProvider).not.toBe(registeredBeforeTheTest.meterProvider);
    });

    it("leaves the logger provider unregistered", ({
      registeredBeforeTheTest,
      theGlobalsWhileSetAside,
    }) => {
      expect(theGlobalsWhileSetAside.loggerProvider).not.toBe(
        registeredBeforeTheTest.loggerProvider,
      );
    });
  });

  describe("once a test that registered its own hands them back", () => {
    const it = registered.extend("theGlobalsAfterTheTest", () => {
      const restore = setAsideGlobalTelemetry();
      process.on("beforeExit", () => undefined);
      context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
      trace.setGlobalTracerProvider(new TracerProvider());
      metrics.setGlobalMeterProvider(new MeterProvider());
      logs.setGlobalLoggerProvider(new LoggerProvider());
      restore();
      return {
        exitListeners: process.listeners("beforeExit"),
        tracerProvider: trace.getTracerProvider(),
        meterProvider: metrics.getMeterProvider(),
        loggerProvider: logs.getLoggerProvider(),
        carriedValue: context.with(ROOT_CONTEXT.setValue(PROBE_KEY, "carried"), () =>
          context.active().getValue(PROBE_KEY),
        ),
      };
    });

    it("hears exactly the beforeExit listeners registered before it", ({
      registeredBeforeTheTest,
      theGlobalsAfterTheTest,
    }) => {
      expect(theGlobalsAfterTheTest.exitListeners).toStrictEqual(
        registeredBeforeTheTest.exitListeners,
      );
    });

    it("measures spans with the tracer provider registered before it", ({
      registeredBeforeTheTest,
      theGlobalsAfterTheTest,
    }) => {
      expect(theGlobalsAfterTheTest.tracerProvider).toBe(registeredBeforeTheTest.tracerProvider);
    });

    it("measures metrics with the meter provider registered before it", ({
      registeredBeforeTheTest,
      theGlobalsAfterTheTest,
    }) => {
      expect(theGlobalsAfterTheTest.meterProvider).toBe(registeredBeforeTheTest.meterProvider);
    });

    it("records logs with the logger provider registered before it", ({
      registeredBeforeTheTest,
      theGlobalsAfterTheTest,
    }) => {
      expect(theGlobalsAfterTheTest.loggerProvider).toBe(registeredBeforeTheTest.loggerProvider);
    });

    it("carries context through the context manager registered before it", ({
      theGlobalsAfterTheTest,
    }) => {
      expect(theGlobalsAfterTheTest.carriedValue).toBe("carried");
    });
  });
});
