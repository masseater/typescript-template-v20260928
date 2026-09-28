import { Identifier } from "@repo/config/paging";
import { reportReasons, reportSubjects } from "@repo/config";
import { Schema } from "effect";


const BlockMember = Schema.Struct({ memberId: Identifier });

const ReportCreate = Schema.Struct({
  reason: Schema.Literals(reportReasons),
  subjectId: Identifier,
  subjectKind: Schema.Literals(reportSubjects),
});


export { BlockMember, ReportCreate };
