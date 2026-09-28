import { Schema } from "effect";

const ConsentSearch = Schema.Struct({ client_id: Schema.optionalKey(Schema.String) });
const consentSearch = Schema.toStandardSchemaV1(ConsentSearch);

const OAuthClientView = Schema.Struct({ client_name: Schema.optionalKey(Schema.String) });

export { OAuthClientView, consentSearch };
