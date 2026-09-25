import { verifySession } from "@repo/auth";
import { JobPayload, WorkflowInstanceState, httpStatus, readJobs } from "@repo/config";
import { sessionFailures } from "@repo/runtime/account";
import { CreatedResource } from "@repo/runtime/contracts";
import { createApi, readJsonBody } from "@repo/runtime/http";
import { env } from "cloudflare:workers";
import { Effect, Schema } from "effect";

import { enqueueJob, jobStatus } from "#shared/jobs/index.ts";

import type { AppServices } from "@repo/runtime";
import type { ApiRoutes } from "@repo/runtime/http";

const JobCreate = Schema.Struct({});

const JobPath = Schema.Struct({ id: JobPayload.fields.jobId });

const JobAccepted = CreatedResource;

const JobStatusView = Schema.Struct({
  ...WorkflowInstanceState.fields,
  id: Schema.String,
});

const failures = {
  ...sessionFailures,
  ConfigurationInvalid: "unexpected" as const,
  JobLookupFailed: "unexpected" as const,
  JobNotFound: { message: "ジョブが見つかりません。", status: httpStatus.notFound },
};

function jobsApi(api: ApiRoutes<AppServices>) {
  return createApi("")
    .post(
      "/jobs",
      ...api.route(
        { response: JobAccepted },
        (request) =>
          Effect.gen(function* handleRequest() {
            const { user } = yield* verifySession(request.headers);
            yield* readJsonBody(JobCreate, request);
            const jobs = yield* readJobs(env);
            const { jobId } = yield* enqueueJob(jobs, user.id);
            return { id: jobId };
          }),
        failures,
      ),
    )
    .get(
      "/jobs/:id",
      ...api.route(
        { params: JobPath, response: JobStatusView },
        (request, { id }) =>
          Effect.gen(function* handleRequest() {
            const { user } = yield* verifySession(request.headers);
            const jobs = yield* readJobs(env);
            const state = yield* jobStatus(jobs, { jobId: id, ownerId: user.id });
            return { ...state, id };
          }),
        failures,
      ),
    );
}

export { jobsApi };
