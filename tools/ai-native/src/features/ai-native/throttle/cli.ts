#!/usr/bin/env node
import { exitWith, firstUserArgumentIndex } from "@repo/cli";
import { Effect } from "effect";

import { runThrottle } from "./run-throttle.ts";

await Effect.runPromise(
  Effect.promise(() => runThrottle(process.argv.slice(firstUserArgumentIndex))).pipe(
    Effect.flatMap(exitWith),
  ),
);
