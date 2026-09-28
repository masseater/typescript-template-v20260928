import { Effect, Result, Schema, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

class ProcessTableUnreadable extends Schema.TaggedError<ProcessTableUnreadable>()(
  "ProcessTableUnreadable",
  { reason: Schema.String },
) {}

const processTableArguments = ["-ax", "-o", "pid=", "-o", "ppid="] as const;

type ProcessRows = ReadonlyArray<readonly [number, number]>;

function processRows(table: string): Result.Result<ProcessRows, string> {
  const rows = table.split("\n").filter((row) => row.trim() !== "");
  const unreadable = rows.find((row) => !/^\s*\d+\s+\d+\s*$/u.test(row));
  if (unreadable !== undefined) {
    return Result.fail(`unreadable process table row: ${unreadable}`);
  }
  return Result.succeed(
    rows.flatMap((row) => {
      const [pid = 0, parent = 0] = row.trim().split(/\s+/u).map(Number);
      return pid > 0 ? [[parent, pid] as const] : [];
    }),
  );
}

function readProcessTable(
  handed: readonly string[] = processTableArguments,
): Effect.Effect<ProcessRows, ProcessTableUnreadable, ChildProcessSpawner.ChildProcessSpawner> {
  return Effect.gen(function* readTable() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const handle = yield* spawner.spawn(
      ChildProcess.make("ps", [...handed], { stderr: "pipe", stdin: "ignore", stdout: "pipe" }),
    );
    const [table, errors, exitCode] = yield* Effect.all(
      [
        Stream.mkString(Stream.decodeText(handle.stdout)),
        Stream.mkString(Stream.decodeText(handle.stderr)),
        handle.exitCode,
      ],
      { concurrency: "unbounded" },
    );
    if (exitCode !== 0) {
      return yield* new ProcessTableUnreadable({
        reason: `ps exited with ${exitCode}: ${errors.trim()}`,
      });
    }
    const rows = processRows(table);
    return Result.isFailure(rows)
      ? yield* new ProcessTableUnreadable({ reason: rows.failure })
      : rows.success;
  }).pipe(
    Effect.scoped,
    Effect.catchTag("PlatformError", (error) =>
      Effect.fail(new ProcessTableUnreadable({ reason: `ps did not run: ${error.message}` })),
    ),
  );
}

function descendantPids(root: number, rows: ProcessRows): number[] {
  const children = new Map<number, number[]>();
  for (const [parent, pid] of rows) {
    const list = children.get(parent);
    if (list === undefined) {
      children.set(parent, [pid]);
    } else {
      list.push(pid);
    }
  }
  const found: number[] = [];
  const pending = [...(children.get(root) ?? [])];
  const seen = new Set<number>();
  while (pending.length > 0) {
    const pid = pending.pop();
    if (pid === undefined || seen.has(pid)) {
      continue;
    }
    seen.add(pid);
    found.push(pid);
    pending.push(...(children.get(pid) ?? []));
  }
  return found;
}

function killQuietly(pid: number): void {
  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ESRCH") {
      return;
    }
    throw error;
  }
}

export { ProcessTableUnreadable, descendantPids, killQuietly, processRows, readProcessTable };
