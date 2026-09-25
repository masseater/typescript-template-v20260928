import { describe, expect, it } from "vite-plus/test";

import { reported } from "./lint-harness-test-fixture.ts";

const filename = "/project/infra/local/src/features/local/compose.ts";

const makeImport = 'import { ChildProcess } from "effect/unstable/process";\n';

const nonPortable = [
  ["literal-absolute-path", `${makeImport}ChildProcess.make("/usr/local/bin/docker-compose", []);`],
  [
    "absolute-path-behind-a-condition",
    `${makeImport}const bundled = "/opt/tool/bin/compose";\nconst command = found ? bundled : "docker";\nChildProcess.make(command, ["compose"]);`,
  ],
  ["node-spawn", 'import { spawn } from "node:child_process";\nspawn("/usr/bin/git", ["status"]);'],
  ["fish-in-tmux", 'run("tmux", ["new-session", "-d", "fish", "-c", command]);'],
  ["zsh", `${makeImport}ChildProcess.make("tmux", ["new-session", "zsh", "-c", command]);`],
] as const;

const portable = [
  ["docker-compose", `${makeImport}ChildProcess.make("docker", ["compose", "-f", file]);`],
  ["sh", 'run("tmux", ["new-session", "-d", "sh", "-c", command]);'],
  ["relative-path-argument", `${makeImport}ChildProcess.make("git", ["-C", "/repo", "status"]);`],
  ["shell-name-without-a-command", 'const shells = ["fish", "zsh"];'],
  ["table-of-shell-prefixes", 'const prefixes = [["sh", "-c"], ["zsh", "-c"]];'],
] as const;

describe("child processes that assume one machine", () => {
  it.for(nonPortable)("rejects %s", ([_label, code]) => {
    expect.assertions(1);
    expect(reported("portable-executable", { code, filename })).toBe(true);
  });

  it.for(portable)("allows %s", ([_label, code]) => {
    expect.assertions(1);
    expect(reported("portable-executable", { code, filename })).toBe(false);
  });
});
