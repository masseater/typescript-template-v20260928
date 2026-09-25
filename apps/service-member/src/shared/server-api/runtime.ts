import { APPLICATION } from "@repo/config";
import { workerRuntime } from "@repo/runtime/worker";
import { env } from "cloudflare:workers";

import { routes } from "#shared/telemetry/index.ts";
import { memberLayer } from "./member-requirement-layer.ts";

import type { Reporting } from "@repo/observability";

const reporting: Reporting = { service: APPLICATION.user };
const runtime = workerRuntime(() => memberLayer(env, routes));

export { reporting, runtime };
