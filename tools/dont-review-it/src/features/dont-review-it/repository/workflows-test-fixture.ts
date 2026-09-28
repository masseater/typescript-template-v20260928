import { Schema } from "effect";
import { parse } from "yaml";

const WorkflowStep = Schema.Struct({
  env: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
  id: Schema.optionalKey(Schema.String),
  if: Schema.optionalKey(Schema.String),
  run: Schema.optionalKey(Schema.String),
  uses: Schema.optionalKey(Schema.String),
  with: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
});

const WorkflowJob = Schema.Struct({
  env: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
  if: Schema.optionalKey(Schema.String),
  needs: Schema.optionalKey(Schema.Array(Schema.String)),
  steps: Schema.optionalKey(Schema.Array(WorkflowStep)),
  strategy: Schema.optionalKey(
    Schema.Struct({
      matrix: Schema.Struct({
        shard: Schema.Array(Schema.Union([Schema.String, Schema.Number])),
      }),
    }),
  ),
  "timeout-minutes": Schema.optionalKey(Schema.Number),
});

const Workflow = Schema.Struct({
  jobs: Schema.Record(Schema.String, WorkflowJob),
  on: Schema.Record(Schema.String, Schema.Unknown),
});

type Workflow = typeof Workflow.Type;
type WorkflowJob = typeof WorkflowJob.Type;
type WorkflowStep = typeof WorkflowStep.Type;

const workflowSources: Readonly<Record<string, string>> = import.meta.glob(
  "../../../../../../.github/workflows/*.yml",
  { eager: true, import: "default" },
);

const decodeWorkflow = Schema.decodeUnknownSync(Workflow);

const workflowNamed = (fileName: string): Workflow => {
  const source = Object.entries(workflowSources).find(([file]) =>
    file.endsWith(`/${fileName}`),
  )?.[1];
  if (source === undefined) {
    throw new Error(`.github/workflows/${fileName} is missing`);
  }
  return decodeWorkflow(parse(source));
};

const jobOf = (workflow: Workflow, jobName: string): WorkflowJob => {
  const job = workflow.jobs[jobName];
  if (job === undefined) {
    throw new Error(`job ${jobName} is missing`);
  }
  return job;
};

const workflowFileNames = Object.keys(workflowSources).map((file) => file.replace(/^.*\//u, ""));

const stepsOf = (workflow: Workflow): readonly WorkflowStep[] =>
  Object.values(workflow.jobs).flatMap((job) => job.steps ?? []);

export { jobOf, stepsOf, workflowFileNames, workflowNamed };
export type { Workflow, WorkflowJob, WorkflowStep };
