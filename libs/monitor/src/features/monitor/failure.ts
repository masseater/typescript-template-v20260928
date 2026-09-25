import { Schema } from "effect";

class MonitorFailure extends Schema.TaggedError<MonitorFailure>()("MonitorFailure", {
  cause: Schema.optionalKey(Schema.Defect()),
  code: Schema.Literals(["alert_config_invalid", "schedule_failed"]),
}) {}

export { MonitorFailure };
