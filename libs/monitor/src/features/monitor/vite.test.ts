import { repositoryRoot } from "@repo/config/repository-root";
import { paths } from "@repo/vite-config";
import { describe, expect, test } from "vite-plus/test";

import { monitorWorkerVite } from "./vite.ts";

const errorMonitorRoot = paths.join(repositoryRoot, "infra/error-monitor");

describe("monitorWorkerVite", () => {
  const it = test.extend("workerVite", () => monitorWorkerVite(errorMonitorRoot));

  it("packs each monitor from its feature worker", ({ workerVite }) => {
    expect(workerVite.pack.entry).toStrictEqual({
      index: "src/features/error-monitor/worker.ts",
    });
  });

  it("type-checks before it builds the packed worker", ({ workerVite }) => {
    expect(workerVite.run.tasks.build.dependsOn).toStrictEqual(
      expect.arrayContaining(["check:effect"]),
    );
  });

  it("builds the packed worker before a pull request", ({ workerVite }) => {
    expect(workerVite.run.tasks.prepr.dependsOn).toStrictEqual(expect.arrayContaining(["build"]));
  });
});

describe("the pack extension", () => {
  const it = test.extend("packedExtension", () => {
    const { outExtensions } = monitorWorkerVite(errorMonitorRoot).pack;
    if (outExtensions === undefined) {
      throw new Error("monitorWorkerVite pack must declare outExtensions");
    }
    return outExtensions({ format: "es", options: {} } as never);
  });

  it("emits JavaScript", ({ packedExtension }) => {
    expect(packedExtension).toStrictEqual({ js: ".js" });
  });
});
