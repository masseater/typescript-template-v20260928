import { measured, type Tasks } from "./run-config.ts";
import { dependencyManifests, taskInput } from "./task-input.ts";

const testRun = measured({
  test: {
    command: "vp test run",
    input: [
      ...taskInput,
      "!coverage/**",
      { base: "workspace", pattern: "!**/coverage/**" },
      ...dependencyManifests,
    ],
    output: [],
  },
} satisfies Tasks);

export { testRun };
