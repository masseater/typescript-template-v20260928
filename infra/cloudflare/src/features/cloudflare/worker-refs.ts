import { wikiWorker } from "@repo/config";
import { Worker } from "alchemy/Cloudflare";

import { stackName } from "./stacks.ts";

import type { Effect } from "effect";

const coreWorkerResource = "Worker";

const wikiWorkerResource = "Worker";

function coreWorkerRef(): Effect.Effect<Worker> {
  return Worker.ref(coreWorkerResource, { stack: stackName("core") });
}

function wikiWorkerRef(): Effect.Effect<Worker> {
  return Worker.ref(wikiWorkerResource, { stack: stackName(wikiWorker) });
}

export { coreWorkerRef, coreWorkerResource, wikiWorkerRef, wikiWorkerResource };
