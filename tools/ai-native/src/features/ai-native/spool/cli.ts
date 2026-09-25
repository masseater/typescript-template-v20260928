#!/usr/bin/env node
import { cliStderr, cliStdout, exitWith, firstUserArgumentIndex } from "@repo/cli";
import { Effect } from "effect";

import { runSpool } from "./run-spool.ts";

await Effect.runPromise(
  Effect.promise(() =>
    runSpool(process.argv.slice(firstUserArgumentIndex), { stdout: cliStdout, stderr: cliStderr }),
  ).pipe(Effect.flatMap(exitWith)),
);
