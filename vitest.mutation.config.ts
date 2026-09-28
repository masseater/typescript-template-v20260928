import {
  devServerTests,
  isolatedNodeTests,
  sandboxUnsafeTests,
  workerTests,
} from "@repo/dont-review-it";
import { defineConfig } from "vite-plus";
import { defaultExclude } from "vite-plus/test/config";

import base from "./vite.config.ts";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    projects: [
      {
        extends: true,
        test: {
          exclude: [
            ...defaultExclude,
            workerTests,
            devServerTests,
            isolatedNodeTests,
            sandboxUnsafeTests,
          ],
          include: [
            "libs/config/**/*.test.ts",
            "libs/runtime/**/*.test.ts",
            "tools/dont-review-it/src/features/dont-review-it/repository/**/*.test.ts",
          ],
          name: "mutation",
        },
      },
    ],
  },
});
