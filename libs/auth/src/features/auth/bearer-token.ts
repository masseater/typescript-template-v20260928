import { Option } from "effect";

const bearerAuthorization = /^bearer\s+(\S+)$/iu;

const bearerToken = (authorization: string | null): Option.Option<string> =>
  Option.fromNullishOr(bearerAuthorization.exec(authorization ?? "")?.[1]);

export { bearerToken };
