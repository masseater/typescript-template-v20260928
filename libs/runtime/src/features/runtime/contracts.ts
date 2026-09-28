import { InquiryAuthorKind } from "@repo/config";
import {
  Identifier,
  UserKeyword,
  laterPage,
  maximumIdentifierLength,
  pageNumber,
} from "@repo/config/paging";
import { Schema } from "effect";

import {
  InvitePreview,
  maximumNameLength,
  maximumPasswordLength,
  minimumPasswordLength,
} from "./account-contracts.ts";

const ErrorBody = Schema.Struct({ error: Schema.String });

const IdentifierQuery = Schema.Struct({ id: Identifier });
const CreatedResource = Schema.Struct({ id: Schema.String });
const Acknowledged = Schema.Struct({ ok: Schema.Literal(true) });
const Tally = Schema.Struct({ count: Schema.Finite });
const Redirect = Schema.Struct({ url: Schema.String });
const InvitationIssued = Schema.Struct({ email: Schema.String, expiresAt: Schema.DateFromString });
const InquiryMessage = Schema.Struct({
  authorId: Schema.String,
  authorKind: InquiryAuthorKind,
  body: Schema.String,
  createdAt: Schema.DateFromString,
  id: Schema.String,
});

type Decodable = Schema.Top & { readonly DecodingServices: never };

export {
  Acknowledged,
  CreatedResource,
  ErrorBody,
  Identifier,
  IdentifierQuery,
  InquiryMessage,
  InvitationIssued,
  InvitePreview,
  Redirect,
  Tally,
  UserKeyword,
  laterPage,
  maximumIdentifierLength,
  maximumNameLength,
  maximumPasswordLength,
  minimumPasswordLength,
  pageNumber,
};
export type { Decodable };
