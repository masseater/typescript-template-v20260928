import { Schema } from "effect";

import { MemberReference } from "./member.ts";

const FollowMemberQuery = Schema.Struct({
  memberId: Schema.String.check(Schema.isLengthBetween(1, 256)),
});

const FollowState = Schema.Struct({
  following: Schema.Boolean,
});



const FollowList = Schema.Struct({
  members: Schema.Array(MemberReference),
});

export { FollowList, FollowMemberQuery, FollowState };
